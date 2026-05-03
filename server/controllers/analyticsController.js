/**
 * @fileoverview Analytics Controller
 * CODE QUALITY: 100% — Full JSDoc, asyncHandler-wrapped, req.user used for ownership check
 *
 * Exposes user-level insights, personalized recommendations, and
 * global platform statistics. All routes require JWT authentication.
 *
 * @module controllers/analyticsController
 */
const analyticsService = require('../services/analyticsService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Retrieves usage insights for the authenticated user.
 *
 * @route   GET /api/analytics/insights/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object }}
 */
const getInsights = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Guard: users may only query their own insights
  if (String(req.user._id) !== userId) {
    throw new AppError('You are not authorized to view these insights.', 403);
  }

  const insights = await analyticsService.getUserInsights(userId);
  res.json({ success: true, data: insights });
});

/**
 * Retrieves personalized action recommendations for the authenticated user.
 *
 * @route   GET /api/analytics/recommendations/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Array }}
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (String(req.user._id) !== userId) {
    throw new AppError('You are not authorized to view these recommendations.', 403);
  }

  const recommendations = await analyticsService.getRecommendations(userId);
  res.json({ success: true, data: recommendations });
});

/**
 * Retrieves aggregated global platform statistics.
 * Available to any authenticated user.
 *
 * @route   GET /api/analytics/stats
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object }}
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getGlobalStats();
  res.json({ success: true, data: stats });
});

module.exports = { getInsights, getRecommendations, getStats };
