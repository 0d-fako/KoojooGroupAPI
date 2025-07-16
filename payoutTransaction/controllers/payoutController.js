const payoutService = require('../services/payoutService');

class PayoutController {
    async createPayout(req, res) {
        try {
            const payoutData = req.body;
            await payoutService.validatePayoutData(payoutData);
            const payout = await payoutService.createPayout(payoutData);
            res.status(201).json(payout);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = new PayoutController();
