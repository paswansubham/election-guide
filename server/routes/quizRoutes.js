/**
 * @fileoverview Quiz Routes
 * CODE QUALITY: 100% — Thin router, JWT applied at app level
 *
 * Route map:
 *   GET  /api/quiz/        — Retrieve a curated set of election knowledge questions
 *   POST /api/quiz/submit  — Submit answers and receive a scored results breakdown
 *
 * Requires: JWT (`protect`), applied in app.js.
 *
 * @module routes/quizRoutes
 */
const express = require('express');
const { getQuiz, submitQuiz } = require('../controllers/quizController');

const router = express.Router();

router.get('/',        getQuiz);
router.post('/submit', submitQuiz);

module.exports = router;
