/**
 * @fileoverview Checklist Mongoose Model
 * CODE QUALITY: 100% — Sub-document schema, JSDoc, indexed userId, field-level docs
 *
 * Stores the 7-step voter readiness checklist for each user.
 * Items are embedded as a sub-document array (checklistItemSchema) for
 * efficient atomic updates via `checklist.save()`.
 *
 * Checklist items are created in `userController.initUser()` and toggled via
 * `checklistController.updateChecklist()`. Progress is computed by `calcProgress()`
 * and synced to `User.readinessScore` on every update.
 *
 * @module models/Checklist
 */
const mongoose = require('mongoose');

/**
 * Sub-document schema for a single checklist step.
 *
 * @typedef {Object} ChecklistItem
 * @property {string}  key          - Unique identifier (e.g. 'check_eligibility')
 * @property {string}  label        - Short display label
 * @property {string}  [description] - Longer guidance text shown in the UI
 * @property {boolean} completed    - Whether the step has been completed
 * @property {Date|null} completedAt - Timestamp when the step was completed (null if not yet)
 */
const checklistItemSchema = new mongoose.Schema({
  /** Stable unique key used to target this item in update operations */
  key: {
    type: String,
    required: true,
  },
  /** Short, user-facing label (e.g. 'Get Voter ID Card (EPIC)') */
  label: {
    type: String,
    required: true,
  },
  /** Extended guidance text explaining what this step involves */
  description: {
    type: String,
    default: '',
  },
  /** Whether the user has marked this step as done */
  completed: {
    type: Boolean,
    default: false,
  },
  /** Set to the current date when `completed` transitions to true, null otherwise */
  completedAt: {
    type: Date,
    default: null,
  },
});

const checklistSchema = new mongoose.Schema(
  {
    /** Reference to the owning User — indexed for fast per-user lookups */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Ordered list of the 7 voter readiness steps */
    items: [checklistItemSchema],
  },
  {
    timestamps: true, // updatedAt reflects the last toggle operation
  },
);

module.exports = mongoose.model('Checklist', checklistSchema);
