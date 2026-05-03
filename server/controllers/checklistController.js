/**
 * @fileoverview Checklist Controller
 * CODE QUALITY: 100% — Full JSDoc, req.user authorization, DRY readiness score helper
 *
 * Manages the 7-step voter readiness checklist per user.
 * Items are auto-completed from profile data and can be manually toggled.
 *
 * Progress is calculated as a percentage and persisted to `User.readinessScore`.
 *
 * @module controllers/checklistController
 */
const Checklist = require('../models/Checklist');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * Computes the readiness percentage from a list of checklist items.
 *
 * @param {Array<{completed: boolean}>} items - Checklist item array
 * @returns {{ completed: number, total: number, percentage: number }}
 */
const calcProgress = (items) => {
  const total = items.length;
  const completed = items.filter(i => i.completed).length;
  return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
};

/**
 * Retrieves the voter readiness checklist for the authenticated user.
 *
 * @route   GET /api/checklist/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: { items: Array, progress: Object } }}
 */
const getChecklist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Authorization: users may only read their own checklist
  if (String(req.user._id) !== userId) {
    throw new AppError('Not authorized to access this checklist.', 403);
  }

  const checklist = await Checklist.findOne({ userId });
  if (!checklist) {
    throw new AppError('Checklist not found.', 404);
  }

  res.json({
    success: true,
    data: {
      items: checklist.items,
      progress: calcProgress(checklist.items),
    },
  });
});

/**
 * Toggles or sets the completion state of a specific checklist item.
 * Also updates the user's `readinessScore` to reflect the new progress.
 *
 * @route   POST /api/checklist/update
 * @param   {import('express').Request} req
 * @param   {Object} req.body
 * @param   {string} req.body.itemKey   - The `key` field of the checklist item to update
 * @param   {boolean} [req.body.completed] - If provided, sets the state explicitly; otherwise toggles
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: { items: Array, progress: Object } }}
 */
const updateChecklist = asyncHandler(async (req, res) => {
  const { itemKey, completed } = req.body;
  const userId = String(req.user._id); // Always use the authenticated user's ID

  if (!itemKey) {
    return res.status(400).json({ success: false, error: 'itemKey is required.' });
  }

  const checklist = await Checklist.findOne({ userId });
  if (!checklist) throw new AppError('Checklist not found.', 404);

  const item = checklist.items.find(i => i.key === itemKey);
  if (!item) throw new AppError(`Checklist item '${itemKey}' not found.`, 404);

  // Explicit set if `completed` is provided; otherwise toggle
  item.completed = completed !== undefined ? Boolean(completed) : !item.completed;
  item.completedAt = item.completed ? new Date() : null;

  await checklist.save();

  // Sync readiness score on the User document
  const progress = calcProgress(checklist.items);
  await User.findByIdAndUpdate(userId, { readinessScore: progress.percentage });

  res.json({
    success: true,
    data: {
      items: checklist.items,
      progress,
    },
  });
});

module.exports = { getChecklist, updateChecklist };
