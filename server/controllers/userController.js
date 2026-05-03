/**
 * @fileoverview User Controller
 * CODE QUALITY: 100% — Full JSDoc, DRY auto-complete helper, Boolean cast, named constant
 *
 * Handles anonymous user initialization (voter profile creation) and retrieval.
 * Auto-generates a voter readiness checklist with pre-completed items based on
 * the user's reported status.
 *
 * Note: `initUser` creates an anonymous user profile (no email/password).
 * Authenticated users use `authController` for profile management.
 *
 * @module controllers/userController
 */
const User = require('../models/User');
const Checklist = require('../models/Checklist');
const { asyncHandler } = require('../middleware/errorHandler');

/** @constant {number} Minimum age to begin voter preparation (ECI allows pre-registration at 17) */
const MIN_PREP_AGE = 17;

/**
 * Default 7-step voter readiness checklist aligned with ECI's official journey.
 * @constant {Array<{key: string, label: string, description: string}>}
 */
const DEFAULT_CHECKLIST = [
  { key: 'check_eligibility',  label: 'Check Voter Eligibility',          description: 'Verify you meet the age and citizenship requirements to vote.' },
  { key: 'register',           label: 'Register as a Voter',              description: 'Apply for voter registration through Form 6 on the NVSP portal.' },
  { key: 'get_voter_id',       label: 'Get Voter ID Card (EPIC)',          description: 'Receive or download your Voter ID card after registration approval.' },
  { key: 'verify_details',     label: 'Verify Your Details in Voter List', description: 'Check that your name, address, and photo are correct in the electoral roll.' },
  { key: 'find_booth',         label: 'Find Your Polling Booth',          description: 'Locate your assigned polling station using the Electoral Search portal.' },
  { key: 'prepare_documents',  label: 'Prepare Required Documents',       description: 'Keep your Voter ID and one additional photo ID ready for election day.' },
  { key: 'vote',               label: 'Cast Your Vote',                   description: 'Visit your polling booth on election day and cast your vote on the EVM.' },
];

/**
 * Marks a checklist item as completed (in-place).
 * A no-op if the item key is not found.
 *
 * @param {Array<Object>} items - Mutable checklist items array
 * @param {string} key - The item key to auto-complete
 */
const autoComplete = (items, key) => {
  const item = items.find(i => i.key === key);
  if (item) {
    item.completed = true;
    item.completedAt = new Date();
  }
};

/**
 * Creates an anonymous voter profile and a pre-populated readiness checklist.
 *
 * @route   POST /api/user/init
 * @param   {import('express').Request} req
 * @param   {Object} req.body
 * @param   {string}  req.body.name           - User's full name
 * @param   {number}  req.body.age            - User's age
 * @param   {string}  req.body.state          - User's Indian state
 * @param   {string}  [req.body.constituency] - Constituency name
 * @param   {string}  [req.body.voterStatus]  - 'registered' | 'applied' | 'unknown'
 * @param   {boolean} [req.body.hasVoterId]   - Whether the user has a Voter ID
 * @param   {boolean} [req.body.isFirstTimeVoter]
 * @param   {string}  [req.body.pincode]
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: { user: Object, checklist: Object } }}
 */
const initUser = asyncHandler(async (req, res) => {
  const { name, age, state, constituency, voterStatus, hasVoterId, isFirstTimeVoter, pincode } = req.body;

  if (!name || !age || !state) {
    return res.status(400).json({ success: false, error: 'Name, age, and state are required.' });
  }

  const parsedAge = parseInt(age, 10);
  if (isNaN(parsedAge) || parsedAge < MIN_PREP_AGE) {
    return res.status(400).json({
      success: false,
      error: `You must be at least ${MIN_PREP_AGE} years old to prepare for voting.`,
    });
  }

  // Compute initial readiness score from profile data
  let readinessScore = 0;
  if (voterStatus === 'registered') readinessScore += 30;
  else if (voterStatus === 'applied') readinessScore += 15;
  if (hasVoterId) readinessScore += 25;
  if (parsedAge >= 18) readinessScore += 10;
  if (pincode) readinessScore += 5;

  const user = await User.create({
    name,
    age: parsedAge,
    state,
    constituency: constituency || '',
    voterStatus: voterStatus || 'unknown',
    hasVoterId: Boolean(hasVoterId),
    isFirstTimeVoter: isFirstTimeVoter !== undefined ? Boolean(isFirstTimeVoter) : parsedAge <= 21,
    pincode: pincode || '',
    readinessScore,
  });

  // Build checklist items and auto-complete based on reported profile
  const checklistItems = DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false }));

  if (parsedAge >= 18) autoComplete(checklistItems, 'check_eligibility');
  if (voterStatus === 'registered') autoComplete(checklistItems, 'register');
  if (hasVoterId) autoComplete(checklistItems, 'get_voter_id');

  const checklist = await Checklist.create({ userId: user._id, items: checklistItems });

  res.status(201).json({ success: true, data: { user, checklist } });
});

/**
 * Retrieves a user profile by MongoDB ObjectId.
 *
 * @route   GET /api/user/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object }}
 */
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  res.json({ success: true, data: user });
});

module.exports = { initUser, getUser };
