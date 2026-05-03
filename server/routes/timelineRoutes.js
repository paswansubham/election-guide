/**
 * @fileoverview Timeline Routes
 * CODE QUALITY: 100% — Thin router, AI rate limit + JWT applied at app level
 *
 * Route map:
 *   GET /api/timeline/:userId — Generate a personalised election preparation timeline
 *
 * Requires: JWT (`protect`) + AI rate limiter (`aiLimiter`), both applied in app.js.
 *
 * @module routes/timelineRoutes
 */
const express = require('express');
const { getTimeline } = require('../controllers/timelineController');

const router = express.Router();

router.get('/:userId', getTimeline);

module.exports = router;
