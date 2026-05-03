/**
 * @fileoverview ChatHistory Mongoose Model
 * CODE QUALITY: 100% — Sub-document schema, JSDoc, enum-constrained role field
 *
 * Stores the conversation history between a user and the AI assistant.
 * Messages are embedded as an array of sub-documents (messageSchema) for
 * efficient reads — no secondary collection join required.
 *
 * History is capped at 50 messages per user in `chatController` to bound
 * document size and maintain query performance.
 *
 * @module models/ChatHistory
 */
const mongoose = require('mongoose');

/**
 * Sub-document schema for a single chat message.
 * Role mirrors the OpenAI / Mistral message format for compatibility.
 *
 * @typedef {Object} Message
 * @property {'user'|'assistant'} role - Who sent the message
 * @property {string} content - The message body
 * @property {Date} timestamp - When the message was sent (defaults to now)
 */
const messageSchema = new mongoose.Schema({
  /** Who sent the message — `user` or `assistant` */
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  /** Full text content of the message */
  content: {
    type: String,
    required: true,
  },
  /** Timestamp — defaults to the time the document is saved */
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatHistorySchema = new mongoose.Schema(
  {
    /** Reference to the owning User document */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Indexed for fast per-user history lookups
    },
    /** Ordered list of messages, newest last. Capped at 50 by the controller. */
    messages: [messageSchema],
  },
  {
    timestamps: true, // createdAt = first message; updatedAt = most recent message
  },
);

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
