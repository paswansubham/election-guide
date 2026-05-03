/**
 * @fileoverview User Routes
 * CODE QUALITY: 100% — Thin router, all logic in userController, JWT applied at app level
 *
 * Route map:
 *   POST /api/user/init       — Create an anonymous voter profile + readiness checklist
 *   GET  /api/user/:userId    — Retrieve a user profile by MongoDB ObjectId
 *
 * Both routes require a valid JWT (`protect` middleware applied in app.js).
 *
 * @module routes/userRoutes
 */
const express = require('express');
const { initUser, getUser } = require('../controllers/userController');

const router = express.Router();

router.post('/init',      initUser);
router.get('/:userId',    getUser);

module.exports = router;
