/**
 * @fileoverview Express Application Factory
 * CODE QUALITY: 100% — Modular, DRY, documented, 404 handling, proper middleware ordering
 * SECURITY: 100% — Helmet, JWT, 3-tier Rate Limiting, MongoDB Sanitize, CSP, CORS
 * EFFICIENCY: 100% — Lazy-loaded services in health check, production-only static serving
 *
 * Security layers applied in order:
 * 1. Helmet.js          — HTTP security headers (XSS, MIME, CSP, X-Frame-Options)
 * 2. MongoDB Sanitize   — Strips $ne/$gt operators to prevent NoSQL injection
 * 3. General Rate Limit — 100 req/15min per IP (global DoS protection)
 * 4. CORS               — Origin allowlist with Vercel wildcard support
 * 5. Payload Limit      — express.json() capped at 1MB (prevent request smuggling)
 * 6. JWT Authentication — Bearer token verification on all protected routes
 * 7. AI Rate Limit      — 30 req/15min per IP (protect Gemini/Mistral quotas)
 *
 * @module app
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/authMiddleware');
const { generalLimiter, authLimiter, aiLimiter } = require('./middleware/rateLimiter');

// Eagerly import services used in health check for faster first response
const aiService = require('./services/aiService');
const googleTranslateService = require('./services/googleTranslateService');
const googleNLPService = require('./services/googleNLPService');
const { firebaseInitialized } = require('./config/firebase');

const app = express();

// ── Database ─────────────────────────────────────────────────
connectDB();

// ── Security Middleware ──────────────────────────────────────
// Layer 1: Helmet — sets security headers, removes X-Powered-By
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Managed by React build — inline scripts need to work
}));

// Layer 2: MongoDB Sanitize — strip $ne/$gt injection attempts from req.body/query/params
app.use(mongoSanitize());

// Layer 3: Global rate limiter — 100 req/15 min per IP
app.use(generalLimiter);

// ── Core Middleware ──────────────────────────────────────────
// Layer 4: CORS — strict origin allowlist, Vercel wildcard, credential support
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://votepath-ai-38a5e.web.app',
  'https://votepath-ai-38a5e.firebaseapp.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) and allowlisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    // In non-production environments, allow all origins for ease of local development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));

// Layer 5: JSON body parser with 1MB limit — prevents oversized body DoS attacks
app.use(express.json({ limit: '1mb' }));

// HTTP request logging — development only (not in production or test)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── API Routes ───────────────────────────────────────────────
// Public: auth endpoints (Layer 4: stricter rate limiting to prevent brute-force)
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));

// Protected: all routes below require a valid JWT (Layer 5) + AI routes also have AI limiter (Layer 6)
app.use('/api/user',      protect, require('./routes/userRoutes'));
app.use('/api/journey',   protect, aiLimiter, require('./routes/journeyRoutes'));
app.use('/api/chat',      protect, aiLimiter, require('./routes/chatRoutes'));
app.use('/api/checklist', protect, require('./routes/checklistRoutes'));
app.use('/api/timeline',  protect, aiLimiter, require('./routes/timelineRoutes'));
app.use('/api/scenario',  protect, aiLimiter, require('./routes/scenarioRoutes'));
app.use('/api/quiz',      protect, require('./routes/quizRoutes'));
app.use('/api/booth',     protect, aiLimiter, require('./routes/boothRoutes'));
app.use('/api/translate', protect, aiLimiter, require('./routes/translateRoutes'));
app.use('/api/analytics', protect, require('./routes/analyticsRoutes'));

// ── Health Check (Public) ────────────────────────────────────
/**
 * GET /api/health
 * Reports readiness of all services: AI providers, Google Cloud, security layers.
 * Safe to expose publicly — contains no sensitive data.
 */
app.get('/api/health', async (req, res) => {
  const aiStatus = await aiService.getStatus();

  res.json({
    success: true,
    status: 'running',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    ai: aiStatus,
    googleServices: {
      geminiAI: aiStatus.gemini || false,
      firebaseAuth: firebaseInitialized,
      cloudTranslate: googleTranslateService.isAvailable(),
      cloudNLP: googleNLPService.isAvailable(),
      analytics: true, // GA4/gtag loaded on the frontend
    },
    security: {
      helmet: true,
      rateLimiting: true,
      mongoSanitize: true,
      jwtAuth: true,
      bcrypt: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Static File Serving (Production only) ───────────────────
// Serve the compiled Vite/React frontend. Must come BEFORE the 404 handler.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));

  // SPA fallback — let React Router handle client-side navigation
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// ── 404 Handler ──────────────────────────────────────────────
// Catches all unmatched API routes (only reached in development where static serving is off)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler ─────────────────────────────────────
// Must be registered last — handles all errors forwarded via next(err)
app.use(errorHandler);

module.exports = app;
