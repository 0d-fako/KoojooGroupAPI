const express = require('express');
const InviteController = require('../controllers/inviteController');

const router = express.Router();

// Generate invite link for a group
router.post('/group/:groupId', InviteController.generateInvite);

// Validate and use invite code
router.post('/join/:inviteCode', InviteController.validateInvite);

// Get invite details by code
router.get('/:inviteCode', InviteController.getInvite);

// Get all invites for a group
router.get('/group/:groupId/list', InviteController.getGroupInvites);

// Get all invites created by a user
router.get('/user/:userId', InviteController.getUserInvites);

// Cancel an invite
router.patch('/:inviteId/cancel', InviteController.cancelInvite);

// Get invite statistics for a group
router.get('/group/:groupId/stats', InviteController.getInviteStats);

// Cleanup expired invites (admin endpoint)
router.post('/cleanup/expired', InviteController.cleanupExpired);

module.exports = router;