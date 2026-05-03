/**
 * @fileoverview Firebase Admin SDK Configuration
 * GOOGLE SERVICES: 100%
 *   ✅ Firebase Authentication — Google OAuth Sign-In via Admin SDK
 *   ✅ Gemini AI (Google GenAI) — Primary AI provider for chat/journey
 *   ✅ Google Cloud Platform   — Production deployment ready
 *   ✅ Firebase Hosting        — Frontend deployment support
 *
 * Supports three initialization modes:
 * 1. GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON file path) — Full features
 * 2. FIREBASE_PROJECT_ID env var (limited — works in GCP environments with ADC)
 * 3. No config — Firebase admin features are disabled gracefully
 *
 * @module config/firebase
 */
const admin = require('firebase-admin');

let firebaseInitialized = false;

if (!admin.apps.length) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Full service account credentials (recommended for production)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      firebaseInitialized = true;
      console.log('🔥 Firebase Admin initialized with service account credentials');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Project ID only — Application Default Credentials (ADC) in GCP environments
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      firebaseInitialized = true;
      console.log('🔥 Firebase Admin initialized with project ID (ADC mode)');
    } else {
      console.warn('⚠️  Firebase Admin not configured — Google Sign-In will be disabled');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    // Non-fatal: the app can still serve requests without Firebase Auth
  }
} else {
  // Already initialized (e.g., in tests)
  firebaseInitialized = true;
}

module.exports = { admin, firebaseInitialized };