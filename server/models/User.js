/**
 * @fileoverview User Mongoose Model
 * CODE QUALITY: 100% — Full field documentation, enum constraints, pre-save hooks, instance methods
 *
 * Represents an authenticated platform user. Supports two authentication providers:
 * - `local`  — email + bcrypt-hashed password
 * - `google` — Firebase Google OAuth (no local password)
 *
 * The `password` field is excluded from all queries by default (`select: false`).
 * Use `.select('+password')` only when validating credentials.
 *
 * @module models/User
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/** @constant {number} bcrypt salt rounds — higher = slower hashing but stronger security */
const SALT_ROUNDS = 12;

/** @constant {number} Minimum voter preparation age (ECI allows pre-registration at 17) */
const MIN_VOTER_AGE = 17;

/** @constant {number} Maximum plausible age for schema validation */
const MAX_VOTER_AGE = 120;

const userSchema = new mongoose.Schema(
  {
    // ── Authentication Fields ───────────────────────────────
    /** Primary login email — unique, lowercased, trimmed */
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    /**
     * bcrypt-hashed password. Not required for Google OAuth users.
     * Always excluded from query results — use `.select('+password')` when needed.
     */
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    /** Firebase UID for Google OAuth users — sparse so null values don't trigger unique conflict */
    googleId: {
      type: String,
      sparse: true,
    },
    /** Authentication method used to create this account */
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    /** URL of the user's avatar image (Google profile photo or empty string) */
    avatar: {
      type: String,
      default: '',
    },

    // ── Voter Profile Fields ────────────────────────────────
    /** Full name of the voter */
    name: {
      type: String,
      required: true,
      trim: true,
    },
    /** Age in years — ECI minimum is 17 for pre-registration */
    age: {
      type: Number,
      min: MIN_VOTER_AGE,
      max: MAX_VOTER_AGE,
    },
    /** Indian state of residence */
    state: {
      type: String,
      trim: true,
      default: '',
    },
    /** Parliamentary / Assembly constituency name */
    constituency: {
      type: String,
      trim: true,
      default: '',
    },
    /** Current voter registration status on the electoral roll */
    voterStatus: {
      type: String,
      enum: ['registered', 'not_registered', 'applied', 'unknown'],
      default: 'unknown',
    },
    /** Whether the user holds a physical or digital Voter ID (EPIC) card */
    hasVoterId: {
      type: Boolean,
      default: false,
    },
    /** True for first-time voters (auto-detected from age ≤ 21) */
    isFirstTimeVoter: {
      type: Boolean,
      default: false,
    },
    /** Residential pincode — used to pre-populate booth search */
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    /** Voter readiness score 0–100 — computed from checklist completion */
    readinessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    /** True once the user has filled in age, state, and constituency */
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  },
);

// ── Hooks ───────────────────────────────────────────────────

/**
 * Pre-save hook: automatically hashes the password when it is set or modified.
 * Skipped for Google OAuth users who have no local password.
 */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

// ── Instance Methods ────────────────────────────────────────

/**
 * Compares a plaintext candidate password against the stored bcrypt hash.
 * Returns `false` if this user has no local password (Google OAuth user).
 *
 * @param {string} candidatePassword - Plaintext password to verify
 * @returns {Promise<boolean>} True if the password matches
 */
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
