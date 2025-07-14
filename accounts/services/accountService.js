// accounts/services/accountService.js (Complete Implementation)
const accountRepository = require('../repositories/accountRepository');
const groupService = require('../../groups/services/groupService');
const monnifyService = require('../../integrations/monnifyService');
const { v4: uuidv4 } = require('uuid');

class AccountService {
  async createGroupAccount(groupId, accountData = {}) {
    try {
      console.log('🚀 Starting group account creation process...');
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      // Check if group exists
      console.log('🔍 Checking if group exists...');
      const group = await groupService.getGroupByGroupId(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      console.log('✅ Group found:', group.groupName);

      // Check if account already exists for this group
      console.log('🔍 Checking for existing account...');
      const existingAccount = await accountRepository.findByGroupId(groupId);
      if (existingAccount) {
        throw new Error('Account already exists for this group');
      }
      console.log('✅ No existing account found');

      // Validate required fields for Monnify
      if (!accountData.customerEmail) {
        throw new Error('Customer email is required');
      }

      if (!accountData.bvn && !accountData.nin) {
        throw new Error('Either BVN or NIN is required');
      }

      console.log('📝 Preparing Monnify account creation...');

      // Prepare payload for Monnify API
      const monnifyPayload = {
        accountReference: `GRP_${groupId}`,
        accountName: `${group.groupName} - Thrift Group`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: accountData.customerEmail,
        customerName: group.groupName,
        bvn: accountData.bvn || null,
        nin: accountData.nin || null,
        restrictPaymentSource: accountData.restrictPaymentSource || false
      };

      console.log('🔗 Calling Monnify API to create reserved account...');
      const monnifyResponse = await monnifyService.createReservedAccount(monnifyPayload);

      console.log('✅ Monnify account created successfully!');
      console.log('🏦 Account details:', {
        accountReference: monnifyResponse.accountReference,
        reservationReference: monnifyResponse.reservationReference,
        accountsCount: monnifyResponse.accounts?.length || 0
      });

      // Create account record in our database
      console.log('💾 Saving account to database...');
      const account = {
        accountId: uuidv4(),
        groupId,
        monnifyAccountReference: monnifyResponse.accountReference,
        virtualAccountNumber: monnifyResponse.accounts[0]?.accountNumber || '', // Primary account number
        bankName: monnifyResponse.accounts[0]?.bankName || '',
        bankCode: monnifyResponse.accounts[0]?.bankCode || '',
        accountName: monnifyResponse.accountName,
        monnifyDetails: {
          customerName: monnifyResponse.customerName || group.groupName,
          customerEmail: monnifyResponse.customerEmail,
          bvn: accountData.bvn,
          nin: accountData.nin,
          contractCode: monnifyResponse.contractCode,
          reservationReference: monnifyResponse.reservationReference,
          status: monnifyResponse.status,
          accounts: monnifyResponse.accounts || [], // All available bank accounts
          collectionChannel: monnifyResponse.collectionChannel,
          reservedAccountType: monnifyResponse.reservedAccountType,
          createdOn: monnifyResponse.createdOn
        },
        lastSyncedAt: new Date()
      };

      const createdAccount = await accountRepository.create(account);
      console.log('✅ Account saved to database successfully!');

      return this.formatAccountResponse(createdAccount);

    } catch (error) {
      console.error('💥 Account creation failed:', error.message);
      throw new Error(`Failed to create group account: ${error.message}`);
    }
  }

  async getAccountByAccountId(accountId) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const account = await accountRepository.findByAccountId(accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      return this.formatAccountResponse(account);

    } catch (error) {
      throw error;
    }
  }

  async getAccountByGroupId(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const account = await accountRepository.findByGroupId(groupId);
      
      if (!account) {
        throw new Error('Account not found for this group');
      }

      return this.formatAccountResponse(account);

    } catch (error) {
      throw error;
    }
  }

  async getAccountByAccountNumber(accountNumber) {
    try {
      if (!accountNumber) {
        throw new Error('Account number is required');
      }

      const account = await accountRepository.findByAccountNumber(accountNumber);
      
      if (!account) {
        throw new Error('Account not found');
      }

      return this.formatAccountResponse(account);

    } catch (error) {
      throw error;
    }
  }

  async getAccountByMonnifyReference(monnifyReference) {
    try {
      if (!monnifyReference) {
        throw new Error('Monnify reference is required');
      }

      const account = await accountRepository.findByMonnifyReference(monnifyReference);
      
      if (!account) {
        throw new Error('Account not found');
      }

      return this.formatAccountResponse(account);

    } catch (error) {
      throw error;
    }
  }

  async getAllAccounts(activeOnly = true) {
    try {
      const accounts = await accountRepository.findAll(activeOnly);
      return accounts.map(account => this.formatAccountResponse(account));

    } catch (error) {
      throw error;
    }
  }

  async updateAccount(accountId, updateData) {
    try {
      this.validateAccountUpdate(updateData);

      const updatedAccount = await accountRepository.update(accountId, updateData);
      
      if (!updatedAccount) {
        throw new Error('Account not found');
      }

      return this.formatAccountResponse(updatedAccount);

    } catch (error) {
      throw error;
    }
  }

  async updateAccountBalance(groupId, amount, type, description = '') {
    try {
      if (!groupId || amount === undefined || !type) {
        throw new Error('Group ID, amount, and transaction type are required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (!['credit', 'debit'].includes(type)) {
        throw new Error('Transaction type must be credit or debit');
      }

      const account = await accountRepository.findByGroupId(groupId);
      
      if (!account) {
        throw new Error('Account not found for this group');
      }

      if (!account.isActive) {
        throw new Error('Cannot update balance for inactive account');
      }

      let balanceUpdate = {};
      
      if (type === 'credit') {
        balanceUpdate = {
          currentBalance: account.currentBalance + amount,
          totalInflow: account.totalInflow + amount
        };
        console.log(`💰 Crediting account: +₦${amount.toLocaleString()}`);
      } else if (type === 'debit') {
        if (account.currentBalance < amount) {
          throw new Error(`Insufficient balance. Available: ₦${account.currentBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`);
        }
        balanceUpdate = {
          currentBalance: account.currentBalance - amount,
          totalOutflow: account.totalOutflow + amount
        };
        console.log(`💸 Debiting account: -₦${amount.toLocaleString()}`);
      }

      const updatedAccount = await accountRepository.updateBalance(account.accountId, balanceUpdate);
      return this.formatAccountResponse(updatedAccount);

    } catch (error) {
      throw error;
    }
  }

  async creditAccount(groupId, amount, description = '') {
    try {
      return await this.updateAccountBalance(groupId, amount, 'credit', description);
    } catch (error) {
      throw error;
    }
  }

  async debitAccount(groupId, amount, description = '') {
    try {
      return await this.updateAccountBalance(groupId, amount, 'debit', description);
    } catch (error) {
      throw error;
    }
  }

  async syncAccountBalance(groupId) {
    try {
      console.log('🔄 Starting balance synchronization...');
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const account = await accountRepository.findByGroupId(groupId);
      
      if (!account) {
        throw new Error('Account not found for this group');
      }

      console.log('📞 Fetching account details from Monnify...');
      
      // Get account details from Monnify
      const monnifyAccount = await monnifyService.getReservedAccountDetails(account.monnifyAccountReference);

      console.log('📊 Monnify account status:', monnifyAccount.status);

      // Get recent transactions to calculate balance (if available)
      try {
        const transactions = await monnifyService.getAccountTransactions(account.monnifyAccountReference, 0, 50);
        
        // Calculate balance from transactions (simplified approach)
        let calculatedBalance = 0;
        if (transactions.content && transactions.content.length > 0) {
          calculatedBalance = transactions.content.reduce((total, transaction) => {
            if (transaction.transactionType === 'CREDIT') {
              return total + transaction.amount;
            }
            return total;
          }, 0);
        }

        console.log(`💰 Calculated balance from transactions: ₦${calculatedBalance.toLocaleString()}`);

        const updatedAccount = await accountRepository.update(account.accountId, {
          currentBalance: calculatedBalance,
          lastSyncedAt: new Date()
        });

        return this.formatAccountResponse(updatedAccount);

      } catch (transactionError) {
        console.log('⚠️ Could not fetch transactions, updating sync timestamp only');
        
        const updatedAccount = await accountRepository.update(account.accountId, {
          lastSyncedAt: new Date()
        });

        return this.formatAccountResponse(updatedAccount);
      }

    } catch (error) {
      console.error('💥 Balance sync failed:', error.message);
      throw error;
    }
  }

  async getAccountTransactions(groupId, page = 0, size = 10) {
    try {
      const account = await accountRepository.findByGroupId(groupId);
      
      if (!account) {
        throw new Error('Account not found for this group');
      }

      console.log(`📋 Fetching transactions for account: ${account.monnifyAccountReference}`);

      const transactions = await monnifyService.getAccountTransactions(
        account.monnifyAccountReference, 
        page, 
        size
      );

      return {
        accountId: account.accountId,
        groupId: account.groupId,
        accountReference: account.monnifyAccountReference,
        transactions: transactions.content || [],
        pagination: {
          page: transactions.page || 0,
          size: transactions.size || 0,
          totalElements: transactions.totalElements || 0,
          totalPages: transactions.totalPages || 0
        }
      };

    } catch (error) {
      throw error;
    }
  }

  async deactivateAccount(accountId, reason = '') {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const account = await accountRepository.findByAccountId(accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      if (!account.isActive) {
        throw new Error('Account is already inactive');
      }

      const updateData = {
        isActive: false,
        notes: reason ? `Deactivated: ${reason}` : 'Account deactivated'
      };

      const updatedAccount = await accountRepository.update(accountId, updateData);
      return this.formatAccountResponse(updatedAccount);

    } catch (error) {
      throw error;
    }
  }

  async activateAccount(accountId) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const account = await accountRepository.findByAccountId(accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      if (account.isActive) {
        throw new Error('Account is already active');
      }

      const updateData = {
        isActive: true,
        notes: 'Account reactivated'
      };

      const updatedAccount = await accountRepository.update(accountId, updateData);
      return this.formatAccountResponse(updatedAccount);

    } catch (error) {
      throw error;
    }
  }

  async getAccountSummary(groupId) {
    try {
      const account = await this.getAccountByGroupId(groupId);
      
      return {
        accountId: account.accountId,
        groupId: account.groupId,
        accountNumber: account.virtualAccountNumber,
        bankName: account.bankName,
        accountName: account.accountName,
        currentBalance: account.currentBalance,
        totalInflow: account.totalInflow,
        totalOutflow: account.totalOutflow,
        isActive: account.isActive,
        lastSyncedAt: account.lastSyncedAt,
        monnifyDetails: {
          reservationReference: account.monnifyDetails?.reservationReference,
          status: account.monnifyDetails?.status,
          allBankAccounts: account.monnifyDetails?.accounts || []
        }
      };

    } catch (error) {
      throw error;
    }
  }

  async getSystemTotals() {
    try {
      return await accountRepository.getTotalBalances();
    } catch (error) {
      throw error;
    }
  }

  async getBanks() {
    try {
      return await monnifyService.getBanks();
    } catch (error) {
      throw error;
    }
  }

  async validateBankAccount(accountNumber, bankCode) {
    try {
      return await monnifyService.validateBankAccount(accountNumber, bankCode);
    } catch (error) {
      throw error;
    }
  }

  async verifyTransaction(transactionReference) {
    try {
      return await monnifyService.verifyTransaction(transactionReference);
    } catch (error) {
      throw error;
    }
  }

  async syncMultipleAccounts(accountIds) {
    try {
      const results = [];
      
      for (const accountId of accountIds) {
        try {
          const account = await accountRepository.findByAccountId(accountId);
          if (account) {
            const synced = await this.syncAccountBalance(account.groupId);
            results.push({ accountId, success: true, data: synced });
          } else {
            results.push({ accountId, success: false, error: 'Account not found' });
          }
        } catch (error) {
          results.push({ accountId, success: false, error: error.message });
        }
      }

      return {
        totalProcessed: accountIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      throw error;
    }
  }

  async syncAllAccounts() {
    try {
      console.log('🔄 Starting sync for all accounts...');
      
      const accounts = await accountRepository.findAll(true); // Only active accounts
      const results = [];

      for (const account of accounts) {
        try {
          console.log(`🔄 Syncing account: ${account.accountId}`);
          const synced = await this.syncAccountBalance(account.groupId);
          results.push({ 
            accountId: account.accountId, 
            groupId: account.groupId,
            success: true, 
            balance: synced.currentBalance 
          });
        } catch (error) {
          console.error(`❌ Failed to sync account ${account.accountId}:`, error.message);
          results.push({ 
            accountId: account.accountId, 
            groupId: account.groupId,
            success: false, 
            error: error.message 
          });
        }
      }

      console.log(`✅ Sync completed. ${results.filter(r => r.success).length}/${results.length} successful`);

      return {
        totalAccounts: accounts.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

    } catch (error) {
      throw error;
    }
  }

  async getAccountStats(groupId) {
    try {
      const account = await this.getAccountByGroupId(groupId);
      const transactions = await this.getAccountTransactions(groupId, 0, 100);

      const stats = {
        accountId: account.accountId,
        groupId: account.groupId,
        balance: account.currentBalance,
        totalInflow: account.totalInflow,
        totalOutflow: account.totalOutflow,
        transactionCount: transactions.pagination.totalElements,
        lastTransactionDate: null,
        averageTransactionAmount: 0,
        largestTransaction: 0,
        recentTransactions: transactions.transactions.slice(0, 5)
      };

      if (transactions.transactions.length > 0) {
        // Calculate stats from transactions
        const amounts = transactions.transactions.map(t => t.amount || 0);
        stats.averageTransactionAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
        stats.largestTransaction = Math.max(...amounts);
        stats.lastTransactionDate = transactions.transactions[0].transactionDate;
      }

      return stats;

    } catch (error) {
      throw error;
    }
  }

  async transferFunds(fromGroupId, toGroupId, amount, description = '') {
    try {
      // This would be for internal transfers between groups
      // For now, we'll use balance updates
      
      if (!fromGroupId || !toGroupId || !amount) {
        throw new Error('From group ID, to group ID, and amount are required');
      }

      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }

      if (fromGroupId === toGroupId) {
        throw new Error('Cannot transfer to the same group');
      }

      // Debit from source account
      await this.debitAccount(fromGroupId, amount, `Transfer to ${toGroupId}: ${description}`);
      
      // Credit to destination account
      await this.creditAccount(toGroupId, amount, `Transfer from ${fromGroupId}: ${description}`);

      return {
        success: true,
        message: 'Transfer completed successfully',
        fromGroupId,
        toGroupId,
        amount,
        description,
        transferredAt: new Date()
      };

    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  async getAccountHistory(groupId, startDate, endDate) {
    try {
      const account = await this.getAccountByGroupId(groupId);
      
      // This would typically fetch from a transactions table
      // For now, we'll get from Monnify
      const transactions = await this.getAccountTransactions(groupId, 0, 100);
      
      // Filter by date if provided
      let filteredTransactions = transactions.transactions;
      
      if (startDate || endDate) {
        filteredTransactions = transactions.transactions.filter(transaction => {
          const transactionDate = new Date(transaction.transactionDate);
          
          if (startDate && transactionDate < new Date(startDate)) {
            return false;
          }
          
          if (endDate && transactionDate > new Date(endDate)) {
            return false;
          }
          
          return true;
        });
      }

      return {
        accountId: account.accountId,
        groupId: account.groupId,
        period: {
          startDate: startDate || 'Beginning',
          endDate: endDate || 'Now'
        },
        transactions: filteredTransactions,
        summary: {
          totalTransactions: filteredTransactions.length,
          totalCredits: filteredTransactions
            .filter(t => t.transactionType === 'CREDIT')
            .reduce((sum, t) => sum + (t.amount || 0), 0),
          totalDebits: filteredTransactions
            .filter(t => t.transactionType === 'DEBIT')
            .reduce((sum, t) => sum + (t.amount || 0), 0)
        }
      };

    } catch (error) {
      throw error;
    }
  }

  async checkAccountHealth(groupId) {
    try {
      const account = await this.getAccountByGroupId(groupId);
      const transactions = await this.getAccountTransactions(groupId, 0, 50);

      const health = {
        accountId: account.accountId,
        groupId: account.groupId,
        isActive: account.isActive,
        balance: account.currentBalance,
        lastSyncedAt: account.lastSyncedAt,
        healthScore: 100, // Start with perfect score
        issues: [],
        recommendations: []
      };

      // Check for issues
      if (!account.isActive) {
        health.healthScore -= 50;
        health.issues.push('Account is inactive');
        health.recommendations.push('Activate the account');
      }

      if (account.currentBalance < 0) {
        health.healthScore -= 30;
        health.issues.push('Negative balance');
        health.recommendations.push('Credit the account to bring balance positive');
      }

      const lastSync = new Date(account.lastSyncedAt);
      const daysSinceSync = (new Date() - lastSync) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSync > 7) {
        health.healthScore -= 20;
        health.issues.push('Account not synced recently');
        health.recommendations.push('Sync account balance with Monnify');
      }

      if (transactions.transactions.length === 0) {
        health.healthScore -= 10;
        health.issues.push('No transaction history');
        health.recommendations.push('Account may not be receiving payments');
      }

      // Ensure score doesn't go below 0
      health.healthScore = Math.max(0, health.healthScore);

      return health;

    } catch (error) {
      throw error;
    }
  }

  // Validation methods
  validateAccountUpdate(updateData) {
    const allowedFields = [
      'accountName', 'isActive', 'notes', 'monnifyDetails'
    ];

    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields for account update: ${invalidFields.join(', ')}`);
    }

    if (updateData.accountName && updateData.accountName.trim().length === 0) {
      throw new Error('Account name cannot be empty');
    }
  }

  formatAccountResponse(account) {
    return {
      accountId: account.accountId,
      groupId: account.groupId,
      monnifyAccountReference: account.monnifyAccountReference,
      virtualAccountNumber: account.virtualAccountNumber,
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountName: account.accountName,
      currentBalance: account.currentBalance,
      totalInflow: account.totalInflow,
      totalOutflow: account.totalOutflow,
      isActive: account.isActive,
      monnifyDetails: account.monnifyDetails,
      lastSyncedAt: account.lastSyncedAt,
      lastTransactionDate: account.lastTransactionDate,
      notes: account.notes,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}

module.exports = new AccountService();