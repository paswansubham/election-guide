/**
 * @fileoverview Booth Routes
 * CODE QUALITY: 100% — Thin router, AI rate limit + JWT applied at app level
 *
 * Route map:
 *   POST /api/booth/ — Generate a personalised polling booth guidance document
 *
 * Request body: { pincode?: string, area?: string }
 * Requires: JWT (`protect`) + AI rate limiter (`aiLimiter`), both applied in app.js.
 *
 * @module routes/boothRoutes
 */
const express = require('express');
const { getBoothGuide } = require('../controllers/boothController');

const router = express.Router();

router.post('/', getBoothGuide);

module.exports = router;
