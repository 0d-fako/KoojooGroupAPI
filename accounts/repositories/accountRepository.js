
const GroupAccount = require('../models/groupAccount');

class AccountRepository {
  async create(accountData) {
    try {
      const account = new GroupAccount(accountData);
      return await account.save();
    } catch (error) {
      throw error;
    }
  }

  async findByAccountId(accountId) {
    try {
      return await GroupAccount.findOne({ accountId });
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId) {
    try {
      return await GroupAccount.findOne({ groupId });
    } catch (error) {
      throw error;
    }
  }

  async findByMonnifyReference(monnifyAccountReference) {
    try {
      return await GroupAccount.findOne({ monnifyAccountReference });
    } catch (error) {
      throw error;
    }
  }

  async findByAccountNumber(virtualAccountNumber) {
    try {
      return await GroupAccount.findOne({ virtualAccountNumber });
    } catch (error) {
      throw error;
    }
  }

  async findAll(activeOnly = true) {
    try {
      const filter = activeOnly ? { isActive: true } : {};
      return await GroupAccount.find(filter).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async update(accountId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await GroupAccount.findOneAndUpdate(
        { accountId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateByGroupId(groupId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await GroupAccount.findOneAndUpdate(
        { groupId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateByMonnifyReference(monnifyReference, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await GroupAccount.findOneAndUpdate(
        { monnifyAccountReference: monnifyReference },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(accountId) {
    try {
      return await GroupAccount.findOneAndDelete({ accountId });
    } catch (error) {
      throw error;
    }
  }

  async updateBalance(accountId, balanceUpdate) {
    try {
      return await GroupAccount.findOneAndUpdate(
        { accountId },
        {
          ...balanceUpdate,
          lastTransactionDate: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateBalanceByMonnifyRef(monnifyRef, balanceUpdate) {
    try {
      return await GroupAccount.findOneAndUpdate(
        { monnifyAccountReference: monnifyRef },
        {
          ...balanceUpdate,
          lastTransactionDate: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async getTotalBalances() {
    try {
      const result = await GroupAccount.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalBalance: { $sum: '$currentBalance' },
            totalInflow: { $sum: '$totalInflow' },
            totalOutflow: { $sum: '$totalOutflow' },
            accountCount: { $sum: 1 }
          }
        }
      ]);
      
      return result[0] || {
        totalBalance: 0,
        totalInflow: 0,
        totalOutflow: 0,
        accountCount: 0
      };
    } catch (error) {
      throw error;
    }
  }

  async findAccountsNeedingSync(hoursOld = 24) {
    try {
      const syncThreshold = new Date();
      syncThreshold.setHours(syncThreshold.getHours() - hoursOld);

      return await GroupAccount.find({
        isActive: true,
        $or: [
          { lastSyncedAt: { $lt: syncThreshold } },
          { lastSyncedAt: null }
        ]
      });
    } catch (error) {
      throw error;
    }
  }

  async getAccountsByDateRange(startDate, endDate) {
    try {
      return await GroupAccount.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AccountRepository();