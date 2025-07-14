// paymentTransaction/repositories/paymentRepository.js
const PaymentTransaction = require('../models/paymentTransaction');

class PaymentRepository {
  async create(paymentData) {
    try {
      const payment = new PaymentTransaction(paymentData);
      return await payment.save();
    } catch (error) {
      throw error;
    }
  }

  async findByTransactionId(transactionId) {
    try {
      return await PaymentTransaction.findOne({ transactionId });
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      return await PaymentTransaction.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId, limit = 50, offset = 0) {
    try {
      return await PaymentTransaction.find({ groupId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    try {
      return await PaymentTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByUserAndGroup(userId, groupId) {
    try {
      return await PaymentTransaction.find({ userId, groupId })
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findByStatus(status, groupId = null, limit = 50, offset = 0) {
    try {
      const filter = { status };
      if (groupId) filter.groupId = groupId;

      return await PaymentTransaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async findByCycleAndTurn(groupId, cycle, turn) {
    try {
      return await PaymentTransaction.find({ groupId, cycle, turn })
        .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findOverduePayments(groupId = null) {
    try {
      const filter = {
        status: 'pending',
        dueDate: { $lt: new Date() }
      };
      
      if (groupId) {
        filter.groupId = groupId;
      }

      return await PaymentTransaction.find(filter)
        .sort({ dueDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findPendingPayments(groupId = null) {
    try {
      const filter = { status: 'pending' };
      if (groupId) filter.groupId = groupId;

      return await PaymentTransaction.find(filter)
        .sort({ dueDate: 1 });
    } catch (error) {
      throw error;
    }
  }

  async update(transactionId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await PaymentTransaction.findOneAndUpdate(
        { transactionId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(transactionId) {
    try {
      return await PaymentTransaction.findOneAndDelete({ transactionId });
    } catch (error) {
      throw error;
    }
  }

  async getPaymentStats(groupId) {
    try {
      return await PaymentTransaction.aggregate([
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

  async getTotalContributions(groupId) {
    try {
      const result = await PaymentTransaction.aggregate([
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
      return await PaymentTransaction.countDocuments({ groupId, status });
    } catch (error) {
      throw error;
    }
  }

  async findByDateRange(groupId, startDate, endDate) {
    try {
      return await PaymentTransaction.find({
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

  async findAll(limit = 100, offset = 0) {
    try {
      return await PaymentTransaction.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentRepository();