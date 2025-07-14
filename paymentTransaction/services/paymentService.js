// paymentTransaction/services/paymentService.js
const PaymentTransaction = require('../models/paymentTransaction');
const membershipService = require('../../memberships/services/membershipService');
const groupService = require('../../groups/services/groupService');
const accountService = require('../../accounts/services/accountService');
const { v4: uuidv4 } = require('uuid');
const { PAYMENT_STATUS, TRANSACTION_TYPE } = require('../../groups/enums/enums');

class PaymentService {
  async createPaymentTransaction(paymentData) {
    try {
      console.log('💳 Creating payment transaction:', paymentData);

      // Validate payment data
      this.validatePaymentData(paymentData);

      // Get group and member info
      const group = await groupService.getGroupByGroupId(paymentData.groupId);
      const membership = await membershipService.getMembershipByUserAndGroup(
        paymentData.userId, 
        paymentData.groupId
      );

      if (!group || !membership) {
        throw new Error('Group or membership not found');
      }

      // Calculate due date based on contribution frequency
      const dueDate = this.calculateDueDate(group.contributionFrequency);

      const payment = {
        transactionId: uuidv4(),
        groupId: paymentData.groupId,
        userId: paymentData.userId,
        type: TRANSACTION_TYPE.CONTRIBUTION,
        amount: paymentData.amount || group.contributionAmount,
        status: PAYMENT_STATUS.PENDING,
        cycle: group.currentCycle,
        turn: group.currentTurn,
        dueDate,
        description: paymentData.description || `Contribution for cycle ${group.currentCycle}`,
        metadata: paymentData.metadata || {}
      };

      const createdPayment = await PaymentTransaction.create(payment);
      console.log('✅ Payment transaction created successfully');

      return this.formatPaymentResponse(createdPayment);

    } catch (error) {
      throw new Error(`Failed to create payment transaction: ${error.message}`);
    }
  }

  async processPayment(transactionId, paymentReference, amount) {
    try {
      console.log('🔄 Processing payment:', { transactionId, paymentReference, amount });

      const payment = await PaymentTransaction.findOne({ transactionId });
      if (!payment) {
        throw new Error('Payment transaction not found');
      }

      if (payment.status !== PAYMENT_STATUS.PENDING) {
        throw new Error('Payment has already been processed');
      }

      // Verify payment amount
      if (amount !== payment.amount) {
        throw new Error(`Payment amount mismatch: expected ${payment.amount}, received ${amount}`);
      }

      // Check if payment is late
      const now = new Date();
      const isLate = now > payment.dueDate;
      const daysPastDue = isLate ? Math.ceil((now - payment.dueDate) / (1000 * 60 * 60 * 24)) : 0;

      // Calculate penalty if late
      let penaltyAmount = 0;
      if (isLate) {
        penaltyAmount = this.calculatePenalty(payment.amount, daysPastDue);
      }

      // Update payment record
      const updateData = {
        status: PAYMENT_STATUS.COMPLETED,
        paidAt: now,
        isLate,
        daysPastDue,
        penaltyAmount,
        paymentReference,
        updatedAt: now
      };

      await PaymentTransaction.findOneAndUpdate(
        { transactionId },
        updateData,
        { new: true }
      );

      // Update group account balance
      await accountService.creditAccount(
        payment.groupId,
        amount,
        `Payment from ${payment.userId} - ${payment.description}`
      );

      // Update member statistics
      await this.updateMemberPaymentStats(payment.userId, payment.groupId, isLate);

      // Update group totals
      await this.updateGroupTotals(payment.groupId, amount);

      console.log('✅ Payment processed successfully');

      return {
        transactionId,
        status: PAYMENT_STATUS.COMPLETED,
        amount,
        penaltyAmount,
        isLate,
        daysPastDue,
        paidAt: now
      };

    } catch (error) {
      // Mark payment as failed
      await PaymentTransaction.findOneAndUpdate(
        { transactionId },
        { 
          status: PAYMENT_STATUS.FAILED,
          updatedAt: new Date()
        }
      );

      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  async updateMemberPaymentStats(userId, groupId, isLate) {
    try {
      const membership = await membershipService.getMembershipByUserAndGroup(userId, groupId);
      
      const statsUpdate = {
        totalContributions: membership.totalContributions + 1
      };

      if (isLate) {
        statsUpdate.latePayments = membership.latePayments + 1;
      } else {
        statsUpdate.onTimePayments = membership.onTimePayments + 1;
      }

      await membershipService.updateMemberStats(membership.membershipId, statsUpdate);
      
      // Recalculate trust score
      await membershipService.calculateMemberTrustScore(membership.membershipId);

    } catch (error) {
      console.error('Error updating member payment stats:', error);
    }
  }

  async updateGroupTotals(groupId, amount) {
    try {
      const group = await groupService.getGroupByGroupId(groupId);
      
      await groupService.updateGroup(groupId, {
        totalContributions: group.totalContributions + amount
      });

    } catch (error) {
      console.error('Error updating group totals:', error);
    }
  }

  async recordMissedPayment(userId, groupId, cycle, turn) {
    try {
      console.log('❌ Recording missed payment:', { userId, groupId, cycle, turn });

      const group = await groupService.getGroupByGroupId(groupId);
      const dueDate = this.calculateDueDate(group.contributionFrequency);

      const missedPayment = {
        transactionId: uuidv4(),
        groupId,
        userId,
        type: TRANSACTION_TYPE.CONTRIBUTION,
        amount: group.contributionAmount,
        status: PAYMENT_STATUS.FAILED,
        cycle,
        turn,
        dueDate,
        isLate: true,
        daysPastDue: Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24)),
        description: `Missed payment for cycle ${cycle}, turn ${turn}`
      };

      await PaymentTransaction.create(missedPayment);

      // Update member stats
      const membership = await membershipService.getMembershipByUserAndGroup(userId, groupId);
      await membershipService.updateMemberStats(membership.membershipId, {
        missedPayments: membership.missedPayments + 1
      });

      // Recalculate trust score
      await membershipService.calculateMemberTrustScore(membership.membershipId);

      console.log('✅ Missed payment recorded');

    } catch (error) {
      console.error('Error recording missed payment:', error);
    }
  }

  async getPaymentHistory(userId, groupId = null, limit = 50) {
    try {
      const filter = { userId };
      if (groupId) {
        filter.groupId = groupId;
      }

      const payments = await PaymentTransaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);

      return payments.map(payment => this.formatPaymentResponse(payment));

    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  async getGroupPayments(groupId, cycle = null, status = null) {
    try {
      const filter = { groupId };
      if (cycle) filter.cycle = cycle;
      if (status) filter.status = status;

      const payments = await PaymentTransaction.find(filter)
        .sort({ createdAt: -1 });

      return payments.map(payment => this.formatPaymentResponse(payment));

    } catch (error) {
      throw new Error(`Failed to get group payments: ${error.message}`);
    }
  }

  async getPaymentStats(groupId) {
    try {
      const stats = await PaymentTransaction.aggregate([
        { $match: { groupId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const latePayments = await PaymentTransaction.countDocuments({
        groupId,
        isLate: true
      });

      const onTimePayments = await PaymentTransaction.countDocuments({
        groupId,
        isLate: false,
        status: PAYMENT_STATUS.COMPLETED
      });

      return {
        groupId,
        statusBreakdown: stats,
        latePayments,
        onTimePayments,
        totalTransactions: stats.reduce((sum, stat) => sum + stat.count, 0)
      };

    } catch (error) {
      throw new Error(`Failed to get payment stats: ${error.message}`);
    }
  }

  calculateDueDate(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'bi_weekly':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'quarterly':
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  calculatePenalty(amount, daysPastDue) {
    // Simple penalty calculation: 1% per day, max 10%
    const penaltyRate = Math.min(0.1, daysPastDue * 0.01);
    return Math.round(amount * penaltyRate);
  }

  validatePaymentData(paymentData) {
    if (!paymentData.groupId) {
      throw new Error('Group ID is required');
    }

    if (!paymentData.userId) {
      throw new Error('User ID is required');
    }

    if (paymentData.amount && paymentData.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
  }

  formatPaymentResponse(payment) {
    return {
      transactionId: payment.transactionId,
      groupId: payment.groupId,
      userId: payment.userId,
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
      cycle: payment.cycle,
      turn: payment.turn,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      isLate: payment.isLate,
      daysPastDue: payment.daysPastDue,
      penaltyAmount: payment.penaltyAmount,
      paymentReference: payment.paymentReference,
      description: payment.description,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };
  }
}

module.exports = new PaymentService();