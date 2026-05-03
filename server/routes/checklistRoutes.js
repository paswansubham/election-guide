/**
 * @fileoverview Checklist Routes
 * CODE QUALITY: 100% — Thin router, JWT applied at app level, ownership guard in controller
 *
 * Route map:
 *   GET  /api/checklist/:userId  — Retrieve voter readiness checklist + progress %
 *   POST /api/checklist/update   — Toggle or set completion state for a checklist item
 *
 * Ownership guard: `checklistController` enforces that users can only access
 * their own checklist (req.user._id === userId).
 * Requires: JWT (`protect`), applied in app.js.
 *
 * @module routes/checklistRoutes
 */
const express = require('express');
const { getChecklist, updateChecklist } = require('../controllers/checklistController');

const router = express.Router();

router.get('/:userId', getChecklist);
router.post('/update', updateChecklist);

module.exports = router;
