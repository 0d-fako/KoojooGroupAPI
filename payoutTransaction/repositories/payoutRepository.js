// payoutTransaction/repositories/payoutRepository.js
const PayoutTransaction = require('../models/payoutTransaction');

class PayoutRepository {
  async create(payoutData) {
    try {
      const payout = new PayoutTransaction(payoutData);
      return await payout.save();
    } catch (error) {
      throw error;
    }
  }

  async findByPayoutId(payoutId) {
    try {
      return await PayoutTransaction.findOne({ payoutId });
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      return await PayoutTransaction.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId, limit = 50, offset = 0) {
    try {
      return await PayoutTransaction.find({ groupId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByRecipientUserId(recipientUserId, limit = 50, offset = 0) {
    try {
      return await PayoutTransaction.find({ recipientUserId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByRecipientAndGroup(recipientUserId, groupId) {
    try {
      return await PayoutTransaction.find({ recipientUserId, groupId })
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findByStatus(status, groupId = null, limit = 50, offset = 0) {
    try {
      const filter = { status };
      if (groupId) filter.groupId = groupId;

      return await PayoutTransaction.find(filter)
        .sort({ scheduledDate: 1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByCycleAndTurn(groupId, cycle, turn) {
    try {
      return await PayoutTransaction.findOne({ groupId, cycle, turn });
    } catch (error) {
      throw error;
    }
  }

  async findPendingPayouts(groupId = null) {
    try {
      const filter = {
        status: 'pending',
        scheduledDate: { $lte: new Date() }
      };
      
      if (groupId) {
        filter.groupId = groupId;
      }

      return await PayoutTransaction.find(filter)
        .sort({ scheduledDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findFailedPayouts(groupId = null) {
    try {
      const filter = {
        status: 'failed',
        $expr: { $lt: ['$retryCount', '$maxRetries'] }
      };
      
      if (groupId) {
        filter.groupId = groupId;
      }

      return await PayoutTransaction.find(filter)
        .sort({ updatedAt: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findUpcomingPayouts(groupId, days = 7) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      return await PayoutTransaction.find({
        groupId,
        status: 'pending',
        scheduledDate: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ scheduledDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findOverduePayouts(groupId = null) {
    try {
      const filter = {
        status: 'pending',
        scheduledDate: { $lt: new Date() }
      };
      
      if (groupId) {
        filter.groupId = groupId;
      }

      return await PayoutTransaction.find(filter)
        .sort({ scheduledDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async update(payoutId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await PayoutTransaction.findOneAndUpdate(
        { payoutId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateByFilter(filter, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await PayoutTransaction.updateMany(filter, updateData);
    } catch (error) {
      throw error;
    }
  }

  async delete(payoutId) {
    try {
      return await PayoutTransaction.findOneAndDelete({ payoutId });
    } catch (error) {
      throw error;
    }
  }

  async getPayoutStats(groupId) {
    try {
      return await PayoutTransaction.aggregate([
        { $match: { groupId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);
    } catch (error) {
      throw error;
    }
  }

  async getTotalPayouts(groupId) {
    try {
      const result = await PayoutTransaction.aggregate([
        { $match: { groupId, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      return result[0] || { totalAmount: 0, count: 0 };
    } catch (error) {
      throw error;
    }
  }

  async countByStatus(groupId, status) {
    try {
      return await PayoutTransaction.countDocuments({ groupId, status });
    } catch (error) {
      throw error;
    }
  }

  async findByDateRange(groupId, startDate, endDate) {
    try {
      return await PayoutTransaction.find({
        groupId,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findScheduledPayouts(groupId, fromDate, toDate) {
    try {
      return await PayoutTransaction.find({
        groupId,
        status: 'pending',
        scheduledDate: {
          $gte: fromDate,
          $lte: toDate
        }
      }).sort({ scheduledDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findAll(limit = 100, offset = 0) {
    try {
      return await PayoutTransaction.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findRetryablePayouts() {
    try {
      return await PayoutTransaction.find({
        status: 'failed',
        $expr: { $lt: ['$retryCount', '$maxRetries'] }
      }).sort({ updatedAt: 1 });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PayoutRepository();