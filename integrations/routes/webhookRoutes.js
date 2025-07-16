const express = require('express');
const WebhookController = require('../controllers/webhookController');

const router = express.Router();

// Main webhook endpoint for Monnify
router.post('/monnify', WebhookController.handleMonnifyWebhook);

// Get webhook statistics (for monitoring)
router.get('/stats', WebhookController.getWebhookStats);

// Test webhook endpoint (for development)
router.post('/test', WebhookController.testWebhook);

module.exports = router;