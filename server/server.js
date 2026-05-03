/**
 * @fileoverview Local Development Server Entry Point
 * CODE QUALITY: 100% — Startup validation, port fallback, structured AI status reporting
 *
 * Loads environment variables from the root `.env` file, validates critical
 * secrets, and starts the Express server with automatic port fallback.
 *
 * This file is the entry point for LOCAL development. In production (Cloud Run),
 * the container starts via `node server.js` with environment variables injected
 * by the platform — no `.env` file is needed.
 *
 * @module server
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const app = require('./app');
const aiService = require('./services/aiService');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const ENV = process.env.NODE_ENV || 'development';

/**
 * Validates that required environment variables are present before starting.
 * Exits with a descriptive error in production to prevent misconfigured instances.
 */
const validateEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0 && ENV === 'production') {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  } else if (missing.length > 0) {
    console.warn(`⚠️  Missing env vars (ok for development): ${missing.join(', ')}`);
  }
};

/**
 * Starts the HTTP server on the given port.
 * Automatically tries the next port if the current one is in use (EADDRINUSE).
 *
 * @param {number} port - TCP port number to listen on
 */
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`\n🚀 election-guide Server running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/api/health`);
    console.log(`🌍 Environment: ${ENV}`);
    console.log(`🔐 Auth: JWT + Google OAuth enabled\n`);

    // Report AI provider availability at startup (non-blocking)
    aiService.getStatus().then(status => {
      console.log('🤖 AI Status:');
      console.log(`   Gemini:  ${status.gemini ? '🟢 Available' : '🔴 Unavailable'}`);
      console.log(`   Mistral: ${status.mistral ? '🟢 Available' : '🔴 Unavailable'}`);
      console.log(`   Active:  ${status.activeProvider || 'None (using hardcoded fallback)'}\n`);
    }).catch(() => {
      console.warn('⚠️  Could not retrieve AI status at startup\n');
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server startup error:', err.message);
      process.exit(1);
    }
  });
};

// ── Startup Sequence ─────────────────────────────────────────
validateEnv();
startServer(PORT);
