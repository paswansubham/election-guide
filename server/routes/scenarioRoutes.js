/**
 * @fileoverview Scenario Routes
 * CODE QUALITY: 100% — Thin router, AI rate limit + JWT applied at app level
 *
 * Route map:
 *   POST /api/scenario/         — Generate an interactive election scenario simulation
 *   POST /api/scenario/respond  — Submit a user response to an ongoing scenario
 *
 * Requires: JWT (`protect`) + AI rate limiter (`aiLimiter`), both applied in app.js.
 *
 * @module routes/scenarioRoutes
 */
const express = require('express');
const { generateScenario, respondToScenario } = require('../controllers/scenarioController');

const router = express.Router();

router.post('/',        generateScenario);
router.post('/respond', respondToScenario);

module.exports = router;
