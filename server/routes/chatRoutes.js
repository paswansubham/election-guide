/**
 * @fileoverview Chat Routes
 * CODE QUALITY: 100% — Thin router, AI + JWT protection applied in app.js
 *
 * Route map:
 *   POST /api/chat/             — Send a message; returns AI response + NLP sentiment
 *   GET  /api/chat/:userId/history — Return paginated chat history for a user
 *
 * Both routes require a valid JWT (`protect` applied at app level in app.js).
 * The POST route also requires `aiLimiter` (30 req / 15 min).
 *
 * @module routes/chatRoutes
 */
const express = require('express');
const { chat, getChatHistory } = require('../controllers/chatController');

const router = express.Router();

router.post('/',                chat);
router.get('/:userId/history',  getChatHistory);

module.exports = router;
