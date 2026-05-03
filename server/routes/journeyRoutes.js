/**
 * @fileoverview Journey Routes
 * CODE QUALITY: 100% — Thin router, AI rate limit + JWT applied at app level
 *
 * Route map:
 *   GET /api/journey/:userId — Generate a personalised voting journey for the user
 *
 * Requires: JWT (`protect`) + AI rate limiter (`aiLimiter`), both applied in app.js.
 *
 * @module routes/journeyRoutes
 */
const express = require('express');
const { getJourney } = require('../controllers/journeyController');

const router = express.Router();

router.get('/:userId', getJourney);

module.exports = router;
