// paymentTransaction/controllers/paymentController.js
const paymentService = require('../services/paymentService');

class PaymentController {
  async createPayment(req, res) {
    try {
      const paymentData = req.body;
      const payment = await paymentService.createPaymentTransaction(paymentData);
      res.status(201).json({
        success: true,
        message: 'Payment transaction created successfully',
        data: payment
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment'
      });
    }
  }

  async getPaymentHistory(req, res) {
    try {
      const { userId } = req.params;
      const { groupId, limit = 50 } = req.query;
      
      const payments = await paymentService.getPaymentHistory(
        userId, 
        groupId, 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment history'
      });
    }
  }

  async getGroupPayments(req, res) {
    try {
      const { groupId } = req.params;
      const { cycle, status } = req.query;
      
      const payments = await paymentService.getGroupPayments(
        groupId, 
        cycle ? parseInt(cycle) : null, 
        status
      );

      res.json({
        success: true,
        data: payments,
        count: payments.length
      });
    } catch (error) {
      console.error('Get group payments error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get group payments'
      });
    }
  }

  async processPayment(req, res) {
    try {
      const { transactionId } = req.params;
      const { paymentReference, amount } = req.body;
      
      const result = await paymentService.processPayment(
        transactionId, 
        paymentReference, 
        amount
      );

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Process payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process payment'
      });
    }
  }

  async getPaymentStats(req, res) {
    try {
      const { groupId } = req.params;
      const stats = await paymentService.getPaymentStats(groupId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get payment stats'
      });
    }
  }
}

module.exports = new PaymentController();