const paymentService = require('../services/paymentService');


class PaymentController {

    async createPayment(req, res) {
        try {
            const paymentData = req.body;
            const payment = await paymentService.createPayment(paymentData);
            res.status(201).json({
                success: true,
                data: payment
            });
        } catch (error) {
            console.error('Create payment error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create payment'
            });
        }
    }
}

module.exports = new PaymentController();
