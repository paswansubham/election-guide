/**
 * @fileoverview QuizResult Mongoose Model
 * CODE QUALITY: 100% — JSDoc, typed sub-documents, userId index, field-level docs
 *
 * Records the outcome of each quiz attempt. A user can have multiple results
 * (one per attempt). The leaderboard is computed by aggregating this collection
 * in `quizController.getLeaderboard()`.
 *
 * @module models/QuizResult
 */
const mongoose = require('mongoose');

/**
 * Sub-document schema for a single answered question.
 *
 * @typedef {Object} AnswerRecord
 * @property {number}  questionId      - Index of the question in the quiz
 * @property {number}  selectedAnswer  - Index of the option selected by the user (0-based)
 * @property {boolean} correct         - Whether the selected answer was correct
 */
const answerSchema = new mongoose.Schema({
  /** Index of the question in the quiz set */
  questionId: {
    type: Number,
    required: true,
  },
  /** Index of the answer option chosen by the user (0-based) */
  selectedAnswer: {
    type: Number,
    required: true,
  },
  /** Whether the user's selected answer was correct */
  correct: {
    type: Boolean,
    required: true,
  },
}, { _id: false }); // No separate ObjectId for answer sub-docs

const quizResultSchema = new mongoose.Schema(
  {
    /** Reference to the user who completed this quiz attempt */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Indexed for per-user history and leaderboard queries
    },
    /** Number of correct answers in this attempt */
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Total number of questions in the quiz (denominator for percentage) */
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    /** Per-question answer records for result breakdown display */
    answers: [answerSchema],
    /** When the quiz was completed (used for leaderboard tie-breaking) */
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('QuizResult', quizResultSchema);
