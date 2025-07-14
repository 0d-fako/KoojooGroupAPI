// groups/routes/groupRoutes.js (Enhanced Version)
const express = require('express');
const GroupController = require('../controllers/groupController');

const router = express.Router();

// Create group (with virtual account and invite link)
router.post('/', GroupController.createGroup);

// Get all groups
router.get('/', GroupController.getAllGroups);

// Get specific group
router.get('/:groupId', GroupController.getGroup);

// Get groups by treasurer
router.get('/treasurer/:treasurerId', GroupController.getTreasurerGroups);

// Get group summary (includes members, account, payments)
router.get('/:groupId/summary', GroupController.getGroupSummary);

// Update group
router.put('/:groupId', GroupController.updateGroup);

// Activate group (when requirements are met)
router.patch('/:groupId/activate', GroupController.activateGroup);

// Add member to group (via invite)
router.post('/:groupId/members', GroupController.addMemberToGroup);

// Initialize payout order (trust-score based randomization)
router.post('/:groupId/payout-order', GroupController.initializePayoutOrder);

// Advance to next turn (triggers payout and rotation)
router.post('/:groupId/advance-turn', GroupController.advanceToNextTurn);

// Group management actions
router.patch('/:groupId/pause', GroupController.pauseGroup);
router.patch('/:groupId/resume', GroupController.resumeGroup);
router.patch('/:groupId/complete', GroupController.completeGroup);

module.exports = router;