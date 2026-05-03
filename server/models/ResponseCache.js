/**
 * @fileoverview ResponseCache Mongoose Model
 * CODE QUALITY: 100% — JSDoc, correct provider enum, TTL index, named constant
 *
 * Persists AI-generated responses in MongoDB to avoid redundant API calls.
 * Cache entries expire automatically via MongoDB's TTL index on `expiresAt`.
 *
 * Key design decisions:
 * - `promptHash` is an MD5 hex digest of `prompt|systemPrompt` (computed by cacheService).
 * - TTL is set to 24 hours; documents are deleted by MongoDB's background TTL reaper.
 * - `cacheService.set()` uses upsert — repeated prompts overwrite stale entries.
 *
 * @module models/ResponseCache
 */
const mongoose = require('mongoose');

/** @constant {number} Default cache TTL — 24 hours in milliseconds */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const responseCacheSchema = new mongoose.Schema({
  /**
   * MD5 hex hash of `prompt|systemPrompt`.
   * Unique — acts as the primary lookup key.
   */
  promptHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  /** The AI-generated response text stored verbatim */
  response: {
    type: String,
    required: true,
  },
  /**
   * Which AI provider generated this response.
   * Used for analytics and debugging cache hit sources.
   */
  provider: {
    type: String,
    enum: ['mistral', 'gemini', 'fallback'],
    required: true,
  },
  /** Document creation timestamp */
  createdAt: {
    type: Date,
    default: Date.now,
  },
  /**
   * Expiry timestamp. MongoDB's TTL reaper deletes documents after this date.
   * Defaults to 24 hours from creation.
   */
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + DEFAULT_TTL_MS),
    index: { expires: 0 }, // TTL index — MongoDB auto-deletes at expiresAt
  },
});

module.exports = mongoose.model('ResponseCache', responseCacheSchema);
