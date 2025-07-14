// payoutTransaction/services/payoutService.js
const PayoutTransaction = require('../models/payoutTransaction');
const membershipService = require('../../memberships/services/membershipService');
const groupService = require('../../groups/services/groupService');
const accountService = require('../../accounts/services/accountService');
const monnifyService = require('../../integrations/monnifyService');
const { v4: uuidv4 } = require('uuid');
const { PAYMENT_STATUS } = require('../../groups/enums/enums');

class PayoutService {
  async createPayout(payoutData) {
    try {
      console.log('💰 Creating payout transaction:', payoutData);

      // Validate payout data
      this.validatePayoutData(payoutData);

      // Get member and group info
      const membership = await membershipService.getMembershipByUserAndGroup(
        payoutData.recipientUserId,
        payoutData.groupId
      );

      const group = await groupService.getGroupByGroupId(payoutData.groupId);

      if (!membership || !group) {
        throw new Error('Membership or group not found');
      }

      // Check if member has already received payout in this cycle
      if (membership.hasReceivedPayout) {
        throw new Error('Member has already received payout in this cycle');
      }

      const payout = {
        payoutId: uuidv4(),
        groupId: payoutData.groupId,
        recipientUserId: payoutData.recipientUserId,
        cycle: payoutData.cycle,
        turn: payoutData.turn,
        amount: payoutData.amount,
        status: PAYMENT_STATUS.PENDING,
        scheduledDate: payoutData.scheduledDate || new Date(),
        description: payoutData.description || `Payout for cycle ${payoutData.cycle}, turn ${payoutData.turn}`,
        metadata: payoutData.metadata || {}
      };

      const createdPayout = await PayoutTransaction.create(payout);
      console.log('✅ Payout transaction created successfully');

      // Attempt to process the payout immediately
      await this.processPayout(createdPayout.payoutId);

      return this.formatPayoutResponse(createdPayout);

    } catch (error) {
      throw new Error(`Failed to create payout: ${error.message}`);
    }
  }

  async processPayout(payoutId) {
    try {
      console.log('🔄 Processing payout:', payoutId);

      const payout = await PayoutTransaction.findOne({ payoutId });
      if (!payout) {
        throw new Error('Payout transaction not found');
      }

      if (payout.status !== PAYMENT_STATUS.PENDING) {
        throw new Error('Payout has already been processed');
      }

      // Get member's bank details
      const membership = await membershipService.getMembershipByUserAndGroup(
        payout.recipientUserId,
        payout.groupId
      );

      if (!membership.bankDetails) {
        throw new Error('Member bank details not found');
      }

      // Verify group account has sufficient balance
      const groupAccount = await accountService.getAccountByGroupId(payout.groupId);
      if (groupAccount.currentBalance < payout.amount) {
        throw new Error('Insufficient group account balance');
      }

      // Process disbursement via Monnify
      console.log('💸 Processing Monnify disbursement...');
      const disbursementResult = await this.processMonnifyDisbursement(payout, membership);

      // Update payout record
      const updateData = {
        status: PAYMENT_STATUS.COMPLETED,
        disbursedAt: new Date(),
        monnifyTransferReference: disbursementResult.reference,
        bankDetails: membership.bankDetails,
        updatedAt: new Date()
      };

      await PayoutTransaction.findOneAndUpdate(
        { payoutId },
        updateData,
        { new: true }
      );

      // Update member record
      await membershipService.updateMemberStats(membership.membershipId, {
        hasReceivedPayout: true,
        lastPayoutReceived: new Date(),
        totalPayouts: membership.totalPayouts + payout.amount
      });

      // Update group totals
      await this.updateGroupPayoutTotals(payout.groupId, payout.amount);

      console.log('✅ Payout processed successfully');

      return {
        payoutId,
        status: PAYMENT_STATUS.COMPLETED,
        amount: payout.amount,
        transferReference: disbursementResult.reference,
        disbursedAt: new Date()
      };

    } catch (error) {
      // Mark payout as failed and increment retry count
      await PayoutTransaction.findOneAndUpdate(
        { payoutId },
        { 
          status: PAYMENT_STATUS.FAILED,
          failureReason: error.message,
          retryCount: { $inc: 1 },
          updatedAt: new Date()
        }
      );

      throw new Error(`Failed to process payout: ${error.message}`);
    }
  }

  async processMonnifyDisbursement(payout, membership) {
    try {
      // This is a placeholder for Monnify disbursement
      // In a real implementation, you would call Monnify's disbursement API
      console.log('🏦 Processing Monnify disbursement...');

      const disbursementData = {
        amount: payout.amount,
        reference: `PAYOUT_${payout.payoutId}`,
        narration: payout.description,
        destinationBankCode: membership.bankDetails.bankCode,
        destinationAccountNumber: membership.bankDetails.accountNumber,
        destinationAccountName: membership.bankDetails.accountName,
        currency: 'NGN'
      };

      // Simulate API call (replace with actual Monnify disbursement call)
      const response = {
        reference: `TXN_${Date.now()}`,
        status: 'SUCCESS',
        amount: payout.amount,
        fee: 26.88 // Monnify fee
      };

      console.log('✅ Monnify disbursement successful:', response);
      return response;

    } catch (error) {
      console.error('💥 Monnify disbursement failed:', error);
      throw new Error(`Disbursement failed: ${error.message}`);
    }
  }

  async retryFailedPayout(payoutId) {
    try {
      console.log('🔄 Retrying failed payout:', payoutId);

      const payout = await PayoutTransaction.findOne({ payoutId });
      if (!payout) {
        throw new Error('Payout transaction not found');
      }

      if (payout.status !== PAYMENT_STATUS.FAILED) {
        throw new Error('Payout is not in failed state');
      }

      if (payout.retryCount >= payout.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }

      // Reset status to pending and retry
      await PayoutTransaction.findOneAndUpdate(
        { payoutId },
        { 
          status: PAYMENT_STATUS.PENDING,
          failureReason: null,
          updatedAt: new Date()
        }
      );

      return await this.processPayout(payoutId);

    } catch (error) {
      throw new Error(`Failed to retry payout: ${error.message}`);
    }
  }

  async updateGroupPayoutTotals(groupId, amount) {
    try {
      const group = await groupService.getGroupByGroupId(groupId);
      
      await groupService.updateGroup(groupId, {
        totalPayouts: group.totalPayouts + amount
      });

    } catch (error) {
      console.error('Error updating group payout totals:', error);
    }
  }

  async getPayoutHistory(recipientUserId, groupId = null, limit = 50) {
    try {
      const filter = { recipientUserId };
      if (groupId) {
        filter.groupId = groupId;
      }

      const payouts = await PayoutTransaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);

      return payouts.map(payout => this.formatPayoutResponse(payout));

    } catch (error) {
      throw new Error(`Failed to get payout history: ${error.message}`);
    }
  }

  async getGroupPayouts(groupId, cycle = null, status = null) {
    try {
      const filter = { groupId };
      if (cycle) filter.cycle = cycle;
      if (status) filter.status = status;

      const payouts = await PayoutTransaction.find(filter)
        .sort({ createdAt: -1 });

      return payouts.map(payout => this.formatPayoutResponse(payout));

    } catch (error) {
      throw new Error(`Failed to get group payouts: ${error.message}`);
    }
  }

  async getPayoutStats(groupId) {
    try {
      const stats = await PayoutTransaction.aggregate([
        { $match: { groupId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const pendingPayouts = await PayoutTransaction.countDocuments({
        groupId,
        status: PAYMENT_STATUS.PENDING
      });

      const completedPayouts = await PayoutTransaction.countDocuments({
        groupId,
        status: PAYMENT_STATUS.COMPLETED
      });

      const failedPayouts = await PayoutTransaction.countDocuments({
        groupId,
        status: PAYMENT_STATUS.FAILED
      });

      return {
        groupId,
        statusBreakdown: stats,
        pendingPayouts,
        completedPayouts,
        failedPayouts,
        totalPayouts: stats.reduce((sum, stat) => sum + stat.count, 0)
      };

    } catch (error) {
      throw new Error(`Failed to get payout stats: ${error.message}`);
    }
  }

  async getPendingPayouts(groupId = null) {
    try {
      const filter = { 
        status: PAYMENT_STATUS.PENDING,
        scheduledDate: { $lte: new Date() }
      };
      
      if (groupId) {
        filter.groupId = groupId;
      }

      const pendingPayouts = await PayoutTransaction.find(filter)
        .sort({ scheduledDate: 1 });

      return pendingPayouts.map(payout => this.formatPayoutResponse(payout));

    } catch (error) {
      throw new Error(`Failed to get pending payouts: ${error.message}`);
    }
  }

  async approvePayoutByTreasurer(payoutId, treasurerId) {
    try {
      console.log('👨‍💼 Treasurer approving payout:', { payoutId, treasurerId });

      const payout = await PayoutTransaction.findOne({ payoutId });
      if (!payout) {
        throw new Error('Payout transaction not found');
      }

      // Verify treasurer has permission
      const group = await groupService.getGroupByGroupId(payout.groupId);
      if (group.treasurerId !== treasurerId) {
        throw new Error('Only group treasurer can approve payouts');
      }

      // Update payout with approval
      await PayoutTransaction.findOneAndUpdate(
        { payoutId },
        {
          approvedBy: treasurerId,
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      );

      // Process the payout
      return await this.processPayout(payoutId);

    } catch (error) {
      throw new Error(`Failed to approve payout: ${error.message}`);
    }
  }

  async schedulePayout(payoutData) {
    try {
      console.log('📅 Scheduling payout:', payoutData);

      const payout = {
        payoutId: uuidv4(),
        groupId: payoutData.groupId,
        recipientUserId: payoutData.recipientUserId,
        cycle: payoutData.cycle,
        turn: payoutData.turn,
        amount: payoutData.amount,
        status: PAYMENT_STATUS.PENDING,
        scheduledDate: payoutData.scheduledDate,
        description: payoutData.description || `Scheduled payout for cycle ${payoutData.cycle}`,
        metadata: payoutData.metadata || {}
      };

      const createdPayout = await PayoutTransaction.create(payout);
      console.log('✅ Payout scheduled successfully');

      return this.formatPayoutResponse(createdPayout);

    } catch (error) {
      throw new Error(`Failed to schedule payout: ${error.message}`);
    }
  }

  async getUpcomingPayouts(groupId, days = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const upcomingPayouts = await PayoutTransaction.find({
        groupId,
        status: PAYMENT_STATUS.PENDING,
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ scheduledDate: 1 });

      return upcomingPayouts.map(payout => this.formatPayoutResponse(payout));

    } catch (error) {
      throw new Error(`Failed to get upcoming payouts: ${error.message}`);
    }
  }

  validatePayoutData(payoutData) {
    if (!payoutData.groupId) {
      throw new Error('Group ID is required');
    }

    if (!payoutData.recipientUserId) {
      throw new Error('Recipient user ID is required');
    }

    if (!payoutData.cycle || payoutData.cycle < 1) {
      throw new Error('Valid cycle number is required');
    }

    if (!payoutData.turn || payoutData.turn < 1) {
      throw new Error('Valid turn number is required');
    }

    if (!payoutData.amount || payoutData.amount <= 0) {
      throw new Error('Payout amount must be positive');
    }
  }

  formatPayoutResponse(payout) {
    return {
      payoutId: payout.payoutId,
      groupId: payout.groupId,
      recipientUserId: payout.recipientUserId,
      cycle: payout.cycle,
      turn: payout.turn,
      amount: payout.amount,
      status: payout.status,
      scheduledDate: payout.scheduledDate,
      disbursedAt: payout.disbursedAt,
      monnifyTransferReference: payout.monnifyTransferReference,
      bankDetails: payout.bankDetails,
      failureReason: payout.failureReason,
      retryCount: payout.retryCount,
      maxRetries: payout.maxRetries,
      approvedBy: payout.approvedBy,
      approvedAt: payout.approvedAt,
      description: payout.description,
      metadata: payout.metadata,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt
    };
  }
}

module.exports = new PayoutService();