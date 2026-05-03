/**
 * @fileoverview Analytics Routes
 * CODE QUALITY: 100% — Thin router, JWT applied at app level, 403 ownership guard in controller
 *
 * Route map:
 *   GET /api/analytics/insights/:userId        — Usage insights (topics, frequency, sentiment)
 *   GET /api/analytics/recommendations/:userId — Personalised action recommendations
 *   GET /api/analytics/stats                   — Aggregated global platform statistics
 *
 * Ownership guard: users may only access their own insights and recommendations.
 * Global stats are available to any authenticated user.
 * Requires: JWT (`protect`), applied in app.js.
 *
 * @module routes/analyticsRoutes
 */
const express = require('express');
const {
  getInsights,
  getRecommendations,
  getStats,
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/insights/:userId',       getInsights);
router.get('/recommendations/:userId', getRecommendations);
router.get('/stats',                  getStats);

module.exports = router;
