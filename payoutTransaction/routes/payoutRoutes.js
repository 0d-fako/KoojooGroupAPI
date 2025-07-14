const express = require('express');
const PayoutController = require('../controllers/payoutController');

const router = express.Router();

// Create payout transaction
router.post('/', PayoutController.createPayout);

// Process payout (manual trigger)
router.patch('/:payoutId/process', PayoutController.processPayout);

// Retry failed payout
router.patch('/:payoutId/retry', PayoutController.retryPayout);

// Approve payout (treasurer action)
router.patch('/:payoutId/approve', PayoutController.approvePayout);

// Schedule payout for future date
router.post('/schedule', PayoutController.schedulePayout);

// Get payout history for user
router.get('/user/:userId', PayoutController.getPayoutHistory);

// Get all payouts for a group
router.get('/group/:groupId', PayoutController.getGroupPayouts);

// Get payout statistics for group
router.get('/group/:groupId/stats', PayoutController.getPayoutStats);

// Get pending payouts
router.get('/pending', PayoutController.getPendingPayouts);

// Get upcoming payouts
router.get('/group/:groupId/upcoming', PayoutController.getUpcomingPayouts);

// Get failed payouts that can be retried
router.get('/failed-retryable', PayoutController.getRetryablePayouts);

module.exports = router;