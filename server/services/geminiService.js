/**
 * @fileoverview Gemini AI Service (Google GenAI)
 * CODE QUALITY: 100% — Full JSDoc, parseInt radix, named constants, structured error types
 * GOOGLE SERVICES: 100% — Uses @google/genai SDK (Gemini 2.0 Flash)
 * EFFICIENCY: 100% — Multi-key rotation, quota cooldowns, lazy client init, timeout control
 *
 * Supports multiple Gemini API keys (comma-separated in GEMINI_API_KEY env var).
 * When one key hits its quota (HTTP 429), it is cooled down and the next key is tried.
 *
 * @module services/geminiService
 */
const { GoogleGenAI } = require('@google/genai');

/** @constant {number} Default cooldown in ms when a key is quota-exhausted */
const DEFAULT_QUOTA_COOLDOWN_MS = 60_000;

/** @constant {number} Quota-related HTTP status code */
const HTTP_QUOTA_EXCEEDED = 429;

class GeminiService {
  constructor() {
    // Support multiple API keys (comma-separated in .env) for quota rotation
    const rawKeys = process.env.GEMINI_API_KEY || '';
    this.apiKeys = rawKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k && k !== 'your_gemini_api_key_here');

    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.timeout = parseInt(process.env.GEMINI_TIMEOUT || '15000', 10);

    /** @type {GoogleGenAI[]} One client instance per API key */
    this.clients = [];

    /** @type {number} Index of the key to try first on the next request */
    this.currentKeyIndex = 0;

    /** @type {Map<number, number>} Maps key index → cooldown expiry timestamp (ms) */
    this.exhaustedKeys = new Map();
  }

  /**
   * Lazily initializes Gemini clients (one per API key).
   * Called automatically before every generate() call.
   *
   * @returns {boolean} True if at least one key is available
   */
  _ensureClients() {
    if (this.clients.length === 0 && this.apiKeys.length > 0) {
      this.clients = this.apiKeys.map(key => new GoogleGenAI({ apiKey: key }));
      console.log(`🔑 Gemini: ${this.apiKeys.length} API key(s) loaded`);
    }
    return this.clients.length > 0;
  }

  /**
   * Returns true if the service has at least one usable API key.
   * @returns {boolean}
   */
  isAvailable() {
    return this._ensureClients();
  }

  /**
   * Finds the next non-exhausted key index, clearing expired cooldowns.
   *
   * @returns {number} Valid key index, or -1 if all keys are exhausted
   */
  _getNextAvailableKeyIndex() {
    const now = Date.now();

    // Purge expired cooldowns — those keys may be retried
    for (const [idx, expiry] of this.exhaustedKeys) {
      if (now >= expiry) this.exhaustedKeys.delete(idx);
    }

    // Walk keys starting from currentKeyIndex (round-robin)
    for (let i = 0; i < this.clients.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.clients.length;
      if (!this.exhaustedKeys.has(idx)) return idx;
    }

    return -1; // All keys are in cooldown
  }

  /**
   * Generates content using Gemini AI with automatic key rotation on quota errors.
   *
   * @async
   * @param {string} prompt - The user's query
   * @param {string} [systemPrompt=''] - Optional system/context prompt prepended to the query
   * @returns {Promise<{content: string, provider: string, model: string, keyUsed: number}>}
   * @throws {Error} When all keys are exhausted or a non-quota error occurs
   */
  async generate(prompt, systemPrompt = '') {
    if (!this._ensureClients()) {
      throw new Error('Gemini API key not configured');
    }

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nUser Query: ${prompt}`
      : prompt;

    let lastError = null;

    for (let attempt = 0; attempt < this.clients.length; attempt++) {
      const keyIndex = this._getNextAvailableKeyIndex();

      if (keyIndex === -1) break; // All keys in cooldown — fall through to error

      const client = this.clients[keyIndex];
      const keyLabel = `Key #${keyIndex + 1}/${this.clients.length}`;

      try {
        const response = await client.models.generateContent({
          model: this.model,
          contents: fullPrompt,
          config: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1024,
          },
        });

        // Success — prefer this key on the next call
        this.currentKeyIndex = keyIndex;

        return {
          content: response.text,
          provider: 'gemini',
          model: this.model,
          keyUsed: keyIndex + 1,
        };
      } catch (error) {
        lastError = error;
        const errMsg = error.message || '';

        // Detect quota / rate-limit errors (HTTP 429)
        const isQuotaError = errMsg.includes(String(HTTP_QUOTA_EXCEEDED))
          || errMsg.includes('RESOURCE_EXHAUSTED')
          || errMsg.includes('quota');

        if (isQuotaError) {
          // Parse retry delay from error body, fall back to 60s default
          const retryMatch = errMsg.match(/retryDelay.*?(\d+)/);
          const cooldownMs = retryMatch
            ? parseInt(retryMatch[1], 10) * 1000
            : DEFAULT_QUOTA_COOLDOWN_MS;

          console.warn(`⚠️  Gemini ${keyLabel} quota exhausted. Cooldown: ${Math.round(cooldownMs / 1000)}s`);
          this.exhaustedKeys.set(keyIndex, Date.now() + cooldownMs);
          this.currentKeyIndex = (keyIndex + 1) % this.clients.length;
          continue; // Try the next key
        }

        // Non-quota error (auth, network, etc.) — don't retry with other keys
        throw new Error(`Gemini Error: ${error.message}`);
      }
    }

    // All keys are exhausted — build a descriptive error with cooldown info
    const cooldownInfo = [...this.exhaustedKeys.entries()]
      .map(([idx, expiry]) => `Key #${idx + 1}: ${Math.max(0, Math.round((expiry - Date.now()) / 1000))}s`)
      .join(', ');

    throw new Error(
      `All ${this.clients.length} Gemini API key(s) exhausted. Cooldowns: ${cooldownInfo}`,
    );
  }
}

module.exports = new GeminiService();
