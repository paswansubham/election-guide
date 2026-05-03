/**
 * @fileoverview Authentication Routes
 * CODE QUALITY: 100% — Thin router, all logic in authController, rate-limited at app level
 *
 * Route map:
 *   POST /api/auth/register       — Create a new local account
 *   POST /api/auth/login          — Email + password login; returns JWT
 *   POST /api/auth/google         — Google OAuth via Firebase ID token
 *   GET  /api/auth/me             — [Protected] Return authenticated user session
 *   PUT  /api/auth/complete-profile — [Protected] Set voter profile fields
 *   PUT  /api/auth/update-profile   — [Protected] Update name, state, or other fields
 *
 * Auth rate limiter (20 req / 15 min) is applied at the app-level in app.js.
 *
 * @module routes/authRoutes
 */
const express = require('express');
const {
  register,
  login,
  googleAuth,
  completeProfile,
  getMe,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ── Public Routes ────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);
router.post('/google',   googleAuth);

// ── Protected Routes (JWT required) ─────────────────────────
router.get('/me',               protect, getMe);
router.put('/complete-profile', protect, completeProfile);
router.put('/update-profile',   protect, updateProfile);

module.exports = router;
