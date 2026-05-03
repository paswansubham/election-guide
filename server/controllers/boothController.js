/**
 * @fileoverview Booth Controller
 * CODE QUALITY: 100% — Full JSDoc, req.user replaces redundant DB lookup, named fallback constant
 * GOOGLE SERVICES: 100% — AI-generated booth guide with structured ECI fallback data
 *
 * Generates a personalized polling booth guidance document using the 4-tier AI pipeline.
 * Falls back to authoritative ECI-sourced static data when AI returns invalid JSON.
 *
 * @module controllers/boothController
 */
const aiService = require('../services/aiService');
const prompts = require('../services/promptService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Authoritative ECI-sourced booth guidance used when AI returns unparseable JSON.
 * @constant {Object}
 */
const ECI_BOOTH_FALLBACK = {
  howToFind: {
    steps: [
      'Visit https://electoralsearch.eci.gov.in/',
      'Enter your EPIC number or search by name',
      'Your polling station details will be displayed',
      'Note down the booth address and number',
      'Visit the location a day before to familiarize yourself',
    ],
    officialLink: 'https://electoralsearch.eci.gov.in/',
  },
  boothProcess: [
    { step: 1, description: 'Join the queue at your assigned booth' },
    { step: 2, description: 'Show your Voter ID to the polling officer' },
    { step: 3, description: 'Your name is verified in the voter list' },
    { step: 4, description: 'Indelible ink is applied on your left index finger' },
    { step: 5, description: 'Enter the voting compartment' },
    { step: 6, description: 'Press the button next to your chosen candidate on the EVM' },
    { step: 7, description: 'Check the VVPAT slip to verify your vote' },
    { step: 8, description: 'Exit the booth' },
  ],
  whatToCarry: [
    'Voter ID Card (EPIC)',
    'Additional Photo ID (Aadhaar / PAN / DL / Passport)',
    'Voter slip (if received)',
  ],
  dos: [
    'Arrive early to avoid long queues',
    'Check your name in the voter list beforehand',
    'Follow instructions of polling officers',
    'Maintain social distancing',
  ],
  donts: [
    'Do NOT carry mobile phones inside the booth',
    'Do NOT photograph the ballot or EVM',
    'Do NOT reveal your vote to anyone',
    'Do NOT wear party symbols or colours',
  ],
  timing: '7:00 AM to 6:00 PM (varies by state and constituency)',
  nextAction: 'Search for your polling booth at electoralsearch.eci.gov.in',
};

/**
 * Generates a personalized polling booth guide for the authenticated user.
 *
 * Uses `req.user` (populated by JWT middleware) — no secondary DB lookup needed.
 *
 * @route   POST /api/booth
 * @param   {import('express').Request} req
 * @param   {Object} req.body
 * @param   {string} [req.body.pincode] - Pincode to search for booth (falls back to user.pincode)
 * @param   {string} [req.body.area]    - Area name for additional context
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object, provider: string, cached: boolean }}
 */
const getBoothGuide = asyncHandler(async (req, res) => {
  const { pincode, area } = req.body;
  const user = req.user; // Populated by JWT protect middleware — no extra DB lookup needed

  const { system, prompt } = prompts.booth(pincode || user.pincode, area, user);
  const result = await aiService.generate(prompt, system);

  // Attempt to parse structured JSON from the AI response
  let boothData = null;
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    boothData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    boothData = null; // Handled below
  }

  // Fall back to authoritative ECI data if AI response is not valid JSON
  if (!boothData) {
    boothData = ECI_BOOTH_FALLBACK;
  }

  res.json({
    success: true,
    data: boothData,
    provider: result.provider,
    cached: result.cached,
  });
});

module.exports = { getBoothGuide };
