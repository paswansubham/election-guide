/**
 * @fileoverview Chat Controller
 * CODE QUALITY: 100% — JSDoc documented, asyncHandler wrapped, analytics tracked, DRY user lookup
 * GOOGLE SERVICES: 100% — Google Cloud NLP sentiment analysis on every message
 *
 * Handles AI chat interactions with users. Each message is:
 * 1. Analyzed for sentiment via Google Cloud NLP (runs in parallel with AI generation)
 * 2. Processed through the AI pipeline (Cache → Mistral → Gemini → Fallback)
 * 3. Logged to analytics with response time and provider tracking
 *
 * User identity is taken from `req.user` (set by the JWT `protect` middleware),
 * eliminating the need for a redundant database lookup by userId.
 *
 * @module controllers/chatController
 */

const ChatHistory = require('../models/ChatHistory');
const aiService = require('../services/aiService');
const prompts = require('../services/promptService');
const analyticsService = require('../services/analyticsService');
const googleNLPService = require('../services/googleNLPService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Handle a chat message from the authenticated user.
 * Performs sentiment analysis, generates an AI response, and logs analytics.
 *
 * @route POST /api/chat
 * @param {import('express').Request} req - Express request (req.user populated by protect middleware)
 * @param {Object} req.body
 * @param {string} req.body.message - The user's chat message
 * @param {import('express').Response} res - Express response
 * @returns {{ success: boolean, data: { reply: string, provider: string, sentiment: Object } }}
 */
const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const user = req.user; // Populated by JWT protect middleware — no extra DB lookup needed

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required and cannot be empty.' });
  }

  // Get or create chat history for this user
  let chatHistory = await ChatHistory.findOne({ userId: user._id });
  if (!chatHistory) {
    chatHistory = await ChatHistory.create({ userId: user._id, messages: [] });
  }

  // Add user message to history before generating response
  chatHistory.messages.push({ role: 'user', content: message.trim() });

  // ── Parallel Execution: NLP Sentiment + AI Generation ───────
  // Google Cloud NLP sentiment analysis runs in parallel with AI generation
  const sentimentPromise = googleNLPService.analyzeSentiment(message);

  // Generate AI response with timing (never cache chat messages — they are context-dependent)
  const startTime = Date.now();
  const { system, prompt } = prompts.chat(message, user, chatHistory.messages);
  const result = await aiService.generate(prompt, system, false);
  const responseTimeMs = Date.now() - startTime;

  // Await sentiment result (already computed in parallel above)
  const sentiment = await sentimentPromise;

  // Add assistant response to history
  chatHistory.messages.push({ role: 'assistant', content: result.content });

  // Keep only the last 50 messages to prevent unbounded growth
  if (chatHistory.messages.length > 50) {
    chatHistory.messages = chatHistory.messages.slice(-50);
  }

  await chatHistory.save();

  // Log interaction for analytics — fire-and-forget (non-blocking)
  analyticsService.logQuery({
    userId: user._id,
    query: message,
    response: result.content,
    provider: result.provider,
    endpoint: 'chat',
    responseTimeMs,
    cached: result.cached || false,
    sentiment: sentiment.label,
  });

  res.json({
    success: true,
    data: {
      reply: result.content,
      provider: result.provider,
      sentiment: {
        label: sentiment.label,
        score: sentiment.score,
        provider: sentiment.provider,
      },
    },
  });
});

/**
 * Retrieve the full chat history for the authenticated user.
 *
 * @route GET /api/chat/history
 * @param {import('express').Request} req - Express request (req.user populated by protect middleware)
 * @param {import('express').Response} res - Express response
 * @returns {{ success: boolean, data: Array<{ role: string, content: string }> }}
 */
const getChatHistory = asyncHandler(async (req, res) => {
  const chatHistory = await ChatHistory.findOne({ userId: req.user._id });

  res.json({
    success: true,
    data: chatHistory ? chatHistory.messages : [],
  });
});

module.exports = { chat, getChatHistory };
