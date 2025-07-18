const accountRepository = require('../repositories/accountRepository');
const monnifyService = require('../../integrations/monnifyService');
const { v4: uuidv4 } = require('uuid');

class AccountService {
  async createGroupAccount(groupId, accountData = {}) {
    try {
      console.log('🚀 Starting group account creation process...');
      
      if (!groupId) {
        throw new Error('Group ID is required');
      }

    
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
        accountName: `Koojoo - ${groupId.substring(0, 8)}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        customerEmail: accountData.customerEmail,
        customerName: `Group ${groupId.substring(0, 8)}`,
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
        virtualAccountNumber: monnifyResponse.accounts[0]?.accountNumber || '',
        bankName: monnifyResponse.accounts[0]?.bankName || '',
        bankCode: monnifyResponse.accounts[0]?.bankCode || '',
        accountName: monnifyResponse.accountName,
        monnifyDetails: {
          customerName: monnifyResponse.customerName || `Group ${groupId.substring(0, 8)}`,
          customerEmail: monnifyResponse.customerEmail,
          bvn: accountData.bvn,
          nin: accountData.nin,
          contractCode: monnifyResponse.contractCode,
          reservationReference: monnifyResponse.reservationReference,
          status: monnifyResponse.status,
          accounts: monnifyResponse.accounts || [],
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

  async getAllAccounts(activeOnly = true) {
    try {
      const accounts = await accountRepository.findAll(activeOnly);
      return accounts.map(account => this.formatAccountResponse(account));

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
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }
}

module.exports = new AccountService();