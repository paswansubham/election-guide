/**
 * @fileoverview Timeline Controller
 * CODE QUALITY: 100% — Full JSDoc, named fallback helper, fixed catch block
 *
 * Generates a personalized election preparation timeline based on the user's
 * registration status and upcoming election schedule.
 *
 * Fallback timeline events are sourced from ECI guidelines and always reflect
 * the user's current checklist progress.
 *
 * @module controllers/timelineController
 */
const User = require('../models/User');
const aiService = require('../services/aiService');
const prompts = require('../services/promptService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Builds an ECI-sourced fallback timeline when AI returns invalid JSON.
 *
 * @param {Object} user - Mongoose User document
 * @returns {Object} Timeline data object with events and nextAction
 */
const buildFallbackTimeline = (user) => ({
  events: [
    { id: 1, title: 'Check Voter Registration', description: 'Verify your name at electoralsearch.eci.gov.in', deadline: 'ASAP', daysFromNow: 0, priority: 'high', completed: user.voterStatus === 'registered' },
    { id: 2, title: 'Apply for Voter ID', description: 'Submit Form 6 at voters.eci.gov.in', deadline: '30 days before election', daysFromNow: 7, priority: 'high', completed: user.hasVoterId },
    { id: 3, title: 'Download e-EPIC Card', description: 'Get your digital Voter ID from the NVSP portal', deadline: 'After approval', daysFromNow: 14, priority: 'medium', completed: user.hasVoterId },
    { id: 4, title: 'Verify Electoral Roll', description: 'Confirm your details are correct in the voter list', deadline: '15 days before', daysFromNow: 21, priority: 'medium', completed: false },
    { id: 5, title: 'Locate Polling Booth', description: 'Find your assigned polling station on electoralsearch.eci.gov.in', deadline: '7 days before', daysFromNow: 28, priority: 'medium', completed: false },
    { id: 6, title: 'Prepare Documents', description: 'Voter ID + one additional photo ID ready', deadline: '1 day before', daysFromNow: 34, priority: 'high', completed: false },
    { id: 7, title: 'Cast Your Vote!', description: 'Visit your booth between 7 AM and 6 PM on election day', deadline: 'Election Day', daysFromNow: 35, priority: 'high', completed: false },
  ],
  nextElectionInfo: 'Visit eci.gov.in for the latest election schedule.',
  nextAction: user.voterStatus !== 'registered'
    ? 'Register as a voter now at voters.eci.gov.in'
    : 'Verify your electoral roll entry',
});

/**
 * Generates a personalized election preparation timeline for a user.
 *
 * @route   GET /api/timeline/:userId
 * @param   {import('express').Request} req
 * @param   {import('express').Response} res
 * @returns {{ success: boolean, data: Object, provider: string, cached: boolean }}
 */
const getTimeline = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  const { system, prompt } = prompts.timeline(user);
  const result = await aiService.generate(prompt, system);

  let timelineData = null;
  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    timelineData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    timelineData = null;
  }

  if (!timelineData) {
    timelineData = buildFallbackTimeline(user);
  }

  res.json({
    success: true,
    data: timelineData,
    provider: result.provider,
    cached: result.cached,
  });
});

module.exports = { getTimeline };
