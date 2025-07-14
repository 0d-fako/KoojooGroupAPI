const express = require('express');
const PaymentController = require('../controllers/paymentController');

const router = express.Router();

// Create payment transaction
router.post('/', PaymentController.createPayment);

// Process payment (after payment confirmation)
router.patch('/:transactionId/process', PaymentController.processPayment);

// Get payment history for user
router.get('/user/:userId', PaymentController.getPaymentHistory);

// Get all payments for a group
router.get('/group/:groupId', PaymentController.getGroupPayments);

// Get payment statistics for group
router.get('/group/:groupId/stats', PaymentController.getPaymentStats);

// Record missed payment
router.post('/missed', PaymentController.recordMissedPayment);

// Webhook endpoint for payment notifications
router.post('/webhook', PaymentController.handlePaymentWebhook);

// Get overdue payments
router.get('/overdue', PaymentController.getOverduePayments);

// Get pending payments
router.get('/pending', PaymentController.getPendingPayments);

module.exports = router;
