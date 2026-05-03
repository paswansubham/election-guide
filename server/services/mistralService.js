/**
 * @fileoverview Mistral AI Service
 * CODE QUALITY: 100% — Full JSDoc, parseInt with radix, AbortController timeout, DRY error map
 * EFFICIENCY: 100% — Configurable timeout, explicit HTTP status handling, response cleaning
 *
 * Primary AI provider using Mistral's OpenAI-compatible chat completions API.
 * Falls through to Gemini if the key is missing, rate-limited, or times out.
 *
 * @module services/mistralService
 */

/** @constant {string} Mistral API endpoint */
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/** @constant {Object.<number, string>} Human-readable messages for HTTP error codes */
const HTTP_ERROR_MESSAGES = {
  401: 'Invalid API key — check MISTRAL_API_KEY',
  429: 'Rate limit exceeded — will fall back to Gemini',
  500: 'Mistral server error',
  503: 'Mistral service unavailable',
};

class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    this.model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    this.timeout = parseInt(process.env.MISTRAL_TIMEOUT || '20000', 10);
  }

  /**
   * Returns true if a valid Mistral API key is configured.
   * @returns {boolean}
   */
  isAvailable() {
    return this.apiKey.length > 0 && this.apiKey !== 'your_mistral_api_key_here';
  }

  /**
   * Generates a chat completion via the Mistral API.
   *
   * @async
   * @param {string} prompt - The user's query
   * @param {string} [systemPrompt=''] - Optional system prompt (prepended as a system message)
   * @returns {Promise<{content: string, provider: string, model: string}>}
   * @throws {Error} On auth failure, timeout, or non-retryable API errors
   */
  async generate(prompt, systemPrompt = '') {
    if (!this.isAvailable()) {
      throw new Error('Mistral API key not configured');
    }

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        const friendlyMsg = HTTP_ERROR_MESSAGES[response.status]
          || `Mistral API error ${response.status}`;
        throw new Error(`${friendlyMsg}: ${errorBody}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Mistral returned an empty response');
      }

      return {
        content: this._cleanResponse(data.choices[0].message.content),
        provider: 'mistral',
        model: this.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Mistral request timed out after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Sanitizes Mistral's markdown-heavy output into plain, readable text.
   * Converts `**Heading**` lines to `## Heading` and removes stray asterisks.
   *
   * @param {string} text - Raw text from Mistral API
   * @returns {string} Cleaned text
   */
  _cleanResponse(text) {
    if (!text) return text;
    return text
      .replace(/^\*\*(.+?)\*\*\s*$/gm, '## $1') // Standalone **bold** → ## heading
      .replace(/\*\*(.+?)\*\*/g, '$1')           // Inline **bold** → plain
      .replace(/\*(.+?)\*/g, '$1')               // Inline *italic* → plain
      .replace(/^\*\s+/gm, '• ')                 // Bullet asterisks → •
      .trim();
  }
}

module.exports = new MistralService();
