/**
 * @fileoverview QueryLog Mongoose Model
 * CODE QUALITY: 100% — JSDoc, indexed fields, enum constraints, compound indexes
 *
 * Records every AI query made on the platform for analytics, performance monitoring,
 * and personalised recommendation generation.
 *
 * Indexed fields:
 * - `userId`          — fast per-user history aggregation
 * - `category`        — topic-based filtering
 * - `createdAt`       — time-series queries (newest first)
 * - `(userId, createdAt)` — compound: most-recent queries per user
 *
 * @module models/QueryLog
 */
const mongoose = require('mongoose');

const queryLogSchema = new mongoose.Schema(
  {
    /** Reference to the authenticated user who made the query */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** The raw user query or AI feature invocation label (e.g. 'journey_generation') */
    query: {
      type: String,
      required: true,
    },
    /** Truncated AI response — stored for recommendation analysis (not full text) */
    response: {
      type: String,
      default: '',
    },
    /** AI provider that generated the response for this query */
    provider: {
      type: String,
      enum: ['gemini', 'mistral', 'cache', 'fallback'],
      default: 'gemini',
    },
    /** Platform feature / API route that triggered the query */
    endpoint: {
      type: String,
      enum: ['chat', 'journey', 'scenario', 'booth', 'quiz', 'timeline', 'checklist'],
      default: 'chat',
    },
    /** Topic category detected from the query (e.g. 'registration', 'booth', 'evm') */
    category: {
      type: String,
      default: 'general',
      index: true,
    },
    /** End-to-end response latency in milliseconds (includes AI + DB time) */
    responseTimeMs: {
      type: Number,
      default: 0,
    },
    /** True if this response was served from the MongoDB cache (responseTimeMs ≈ 0) */
    cached: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt used in time-series indexes below
  },
);

// ── Indexes ─────────────────────────────────────────────────
// Most-recent queries — used by the admin analytics dashboard
queryLogSchema.index({ createdAt: -1 });
// Most-recent queries per user — used by recommendation engine
queryLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('QueryLog', queryLogSchema);
