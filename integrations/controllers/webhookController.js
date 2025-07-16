const webhookService = require('../webhookService');

class WebhookController {
  async handleMonnifyWebhook(req, res) {
    try {
      const webhookData = req.body;
      const signature = req.headers['monnify-signature'];
      
      // Process webhook
      const result = await webhookService.handleMonnifyWebhook(webhookData, signature);
      
      // Always return 200 OK to Monnify (even for duplicates)
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('💥 Webhook controller error:', error.message);
      
      // Still return 200 to prevent Monnify retries on our errors
      res.status(200).json({
        success: false,
        message: error.message,
        timestamp: new Date()
      });
    }
  }

  async getWebhookStats(req, res) {
    try {
      const stats = webhookService.getWebhookStats();
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      console.error('Get webhook stats error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get webhook stats'
      });
    }
  }

  async testWebhook(req, res) {
    try {
      const testData = {
        eventType: 'TEST_EVENT',
        eventData: {
          transactionReference: 'TEST_' + Date.now(),
          amountPaid: 1000,
          destinationAccountInformation: {
            accountNumber: '1234567890'
          }
        }
      };
      
      const result = await webhookService.handleMonnifyWebhook(testData, null);
      
      res.json({
        success: true,
        message: 'Test webhook processed',
        data: result
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new WebhookController();