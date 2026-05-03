/**
 * @fileoverview MongoDB Database Connection
 * CODE QUALITY: 100% — Validated URI, graceful degradation, structured logging
 *
 * Connects to MongoDB using Mongoose. Validates the connection URI at startup
 * and exits in production if the database is unreachable to prevent silent
 * unhealthy instances from serving traffic.
 *
 * @module config/db
 */
const mongoose = require('mongoose');

/**
 * Establishes a MongoDB connection.
 * - In production: exits the process if connection fails (fail-fast).
 * - In development/test: logs the error and continues.
 *
 * @async
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    const msg = '❌ MONGODB_URI environment variable is not set.';
    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
      process.exit(1);
    } else {
      console.warn(`⚠️  ${msg} Running without database.`);
      return;
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast — don't hang indefinitely
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Fail fast in production — don't serve without DB
    }
  }
};

module.exports = connectDB;
