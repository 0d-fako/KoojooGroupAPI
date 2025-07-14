const express = require('express');
const MembershipController = require('../controllers/membershipController');

const router = express.Router();

// Create membership
router.post('/', MembershipController.createMembership);

// Get specific membership
router.get('/:membershipId', MembershipController.getMembership);

// Get all memberships for a group
router.get('/group/:groupId', MembershipController.getGroupMemberships);

// Get all memberships for a user
router.get('/user/:userId', MembershipController.getUserMemberships);

// Get specific user's membership in a group
router.get('/user/:userId/group/:groupId', MembershipController.getUserGroupMembership);

// Get member by payout position in group
router.get('/group/:groupId/position/:position', MembershipController.getMemberByPosition);

// Update membership
router.put('/:membershipId', MembershipController.updateMembership);

// Suspend member
router.patch('/:membershipId/suspend', MembershipController.suspendMember);

// Reactivate member
router.patch('/:membershipId/reactivate', MembershipController.reactivateMember);

// Update member stats
router.patch('/:membershipId/stats', MembershipController.updateMemberStats);

// Calculate trust score
router.post('/:membershipId/trust-score', MembershipController.calculateTrustScore);

module.exports = router;