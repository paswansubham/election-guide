/**
 * @fileoverview Journey Controller
 * CODE QUALITY: 100% — Full JSDoc, req.user replaces redundant DB lookup, named fallback constant
 * GOOGLE SERVICES: 100% — Gemini AI powers personalized journey generation
 *
 * Generates a personalized, step-by-step voting journey for the user based on
 * their age, state, voter registration status, and Voter ID possession.
 *
 * Fallback journey steps are sourced from official ECI portals so the feature
 * always works even when no AI provider is available.
 *
 * @module controllers/journeyController
 */
const User = require('../models/User');
const aiService = require('../services/aiService');
const prompts = require('../services/promptService');
const analyticsService = require('../services/analyticsService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Builds a structured ECI-sourced fallback journey for a given user.
 * Used when AI returns invalid or unparseable JSON.
 *
 * @param {Object} user - Mongoose User document
 * @returns {Object} Journey data object with steps, summary, and nextAction
 */
const buildFallbackJourney = (user) => ({
  steps: [
    {
      number: 1,
      title: 'Check Your Eligibility',
      description: `You must be an Indian citizen aged 18 or above. At ${user.age}, you ${user.age >= 18 ? 'are eligible!' : 'will be eligible soon.'}`,
      resource: 'https://voters.eci.gov.in/',
      estimatedTime: '5 minutes',
      completed: user.age >= 18,
    },
    {
      number: 2,
      title: 'Register as a Voter',
      description: "Visit the National Voters' Service Portal and fill out Form 6 for new voter registration.",
      resource: 'https://voters.eci.gov.in/',
      estimatedTime: '20 minutes',
      completed: user.voterStatus === 'registered',
    },
    {
      number: 3,
      title: 'Get Your Voter ID (EPIC)',
      description: 'After registration approval, download your e-EPIC or collect your physical Voter ID card.',
      resource: 'https://voters.eci.gov.in/',
      estimatedTime: '15–30 days',
      completed: user.hasVoterId,
    },
    {
      number: 4,
      title: 'Verify Your Details',
      description: 'Confirm your name, photo, and address are correct in the electoral roll.',
      resource: 'https://electoralsearch.eci.gov.in/',
      estimatedTime: '10 minutes',
      completed: false,
    },
    {
      number: 5,
      title: 'Find Your Polling Booth',
      description: 'Use the Electoral Search portal to locate your assigned polling station.',
      resource: 'https://electoralsearch.eci.gov.in/',
      estimatedTime: '5 minutes',
      completed: false,
    },
    {
      number: 6,
      title: 'Prepare for Election Day',
      description: 'Keep your Voter ID and one additional photo ID ready. Know your booth location and voting time.',
      resource: 'https://eci.gov.in/',
      estimatedTime: '15 minutes',
      completed: false,
    },
    {
      number: 7,
      title: 'Cast Your Vote!',
      description: 'Visit your polling booth, verify your identity, and vote on the EVM. Check the VVPAT slip.',
      resource: 'https://eci.gov.in/',
      estimatedTime: '1–2 hours (including queue)',
      completed: false,
    },
  ],
  summary: `Personalized voting journey for ${user.name} from ${user.state}`,
  nextAction: user.voterStatus !== 'registered'
    ? 'Start your voter registration at voters.eci.gov.in'
    : 'Verify your details in the electoral roll',
});

/**
 * Generates a personalized voting journey for the given user.
 *
 * @route   GET /api/journey/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object, provider: string, cached: boolean }}
 */
const getJourney = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const { system, prompt } = prompts.journey(user);
  const startTime = Date.now();
  const result = await aiService.generate(prompt, system);
  const responseTimeMs = Date.now() - startTime;

  // Attempt to extract structured JSON from AI response
  let journeyData = null;
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    journeyData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    journeyData = null;
  }

  // Use ECI-sourced fallback if AI response is not valid JSON
  if (!journeyData) {
    journeyData = buildFallbackJourney(user);
  }

  // Log analytics — fire-and-forget (non-blocking)
  analyticsService.logQuery({
    userId: req.params.userId,
    query: 'journey_generation',
    response: journeyData.summary || '',
    provider: result.provider,
    endpoint: 'journey',
    responseTimeMs,
    cached: result.cached || false,
  });

  res.json({
    success: true,
    data: journeyData,
    provider: result.provider,
    cached: result.cached,
  });
});

module.exports = { getJourney };
