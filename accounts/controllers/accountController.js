// accounts/controllers/accountController.js (Final version with test methods)
const accountService = require('../services/accountService');

class AccountController {
  async createAccount(req, res) {
    try {
      const { groupId, customerEmail, bvn, nin, restrictPaymentSource } = req.body;
      
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required'
        });
      }

      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message: 'Customer email is required'
        });
      }

      if (!bvn && !nin) {
        return res.status(400).json({
          success: false,
          message: 'Either BVN or NIN is required'
        });
      }

      const accountData = {
        customerEmail,
        bvn,
        nin,
        restrictPaymentSource: restrictPaymentSource || false
      };

      const account = await accountService.createGroupAccount(groupId, accountData);

      res.status(201).json({
        success: true,
        message: 'Group account created successfully',
        data: account
      });

    } catch (error) {
      console.error('Create account error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create account'
      });
    }
  }

  async getAccount(req, res) {
    try {
      const { accountId } = req.params;
      const account = await accountService.getAccountByAccountId(accountId);

      res.json({
        success: true,
        data: account
      });

    } catch (error) {
      console.error('Get account error:', error);
      
      const statusCode = error.message === 'Account not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch account'
      });
    }
  }

  async getAccountByGroup(req, res) {
    try {
      const { groupId } = req.params;
      const account = await accountService.getAccountByGroupId(groupId);

      res.json({
        success: true,
        data: account
      });

    } catch (error) {
      console.error('Get account by group error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch account'
      });
    }
  }

  async getAccountByNumber(req, res) {
    try {
      const { accountNumber } = req.params;
      const account = await accountService.getAccountByAccountNumber(accountNumber);

      res.json({
        success: true,
        data: account
      });

    } catch (error) {
      console.error('Get account by number error:', error);
      
      const statusCode = error.message === 'Account not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch account'
      });
    }
  }

  async getAllAccounts(req, res) {
    try {
      const { includeInactive } = req.query;
      const activeOnly = includeInactive !== 'true';
      
      const accounts = await accountService.getAllAccounts(activeOnly);

      res.json({
        success: true,
        data: accounts,
        count: accounts.length
      });

    } catch (error) {
      console.error('Get all accounts error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch accounts'
      });
    }
  }

  async updateAccount(req, res) {
    try {
      const { accountId } = req.params;
      const updateData = req.body;
      
      const account = await accountService.updateAccount(accountId, updateData);

      res.json({
        success: true,
        message: 'Account updated successfully',
        data: account
      });

    } catch (error) {
      console.error('Update account error:', error);
      
      const statusCode = error.message === 'Account not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update account'
      });
    }
  }

  async updateBalance(req, res) {
    try {
      const { groupId } = req.params;
      const { amount, type, description } = req.body;
      
      if (!amount || !type) {
        return res.status(400).json({
          success: false,
          message: 'Amount and transaction type are required'
        });
      }

      if (!['credit', 'debit'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Transaction type must be credit or debit'
        });
      }

      const account = await accountService.updateAccountBalance(groupId, amount, type, description);

      res.json({
        success: true,
        message: `Balance ${type}ed successfully`,
        data: account
      });

    } catch (error) {
      console.error('Update balance error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update balance'
      });
    }
  }

  async syncBalance(req, res) {
    try {
      const { groupId } = req.params;
      const account = await accountService.syncAccountBalance(groupId);

      res.json({
        success: true,
        message: 'Balance synchronized successfully',
        data: account
      });

    } catch (error) {
      console.error('Sync balance error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to sync balance'
      });
    }
  }

  async getAccountTransactions(req, res) {
    try {
      const { groupId } = req.params;
      const { page = 0, size = 10 } = req.query;
      
      const result = await accountService.getAccountTransactions(
        groupId, 
        parseInt(page), 
        parseInt(size)
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get account transactions error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch transactions'
      });
    }
  }

  async deactivateAccount(req, res) {
    try {
      const { accountId } = req.params;
      const { reason } = req.body;
      
      const account = await accountService.deactivateAccount(accountId, reason);

      res.json({
        success: true,
        message: 'Account deactivated successfully',
        data: account
      });

    } catch (error) {
      console.error('Deactivate account error:', error);
      
      const statusCode = error.message === 'Account not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to deactivate account'
      });
    }
  }

  async activateAccount(req, res) {
    try {
      const { accountId } = req.params;
      const account = await accountService.activateAccount(accountId);

      res.json({
        success: true,
        message: 'Account activated successfully',
        data: account
      });

    } catch (error) {
      console.error('Activate account error:', error);
      
      const statusCode = error.message === 'Account not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to activate account'
      });
    }
  }

  async getAccountSummary(req, res) {
    try {
      const { groupId } = req.params;
      const summary = await accountService.getAccountSummary(groupId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Get account summary error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch account summary'
      });
    }
  }

  async getSystemTotals(req, res) {
    try {
      const totals = await accountService.getSystemTotals();

      res.json({
        success: true,
        data: totals
      });

    } catch (error) {
      console.error('Get system totals error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch system totals'
      });
    }
  }

  async verifyMonnifyTransaction(req, res) {
    try {
      const { transactionReference } = req.params;
      
      if (!transactionReference) {
        return res.status(400).json({
          success: false,
          message: 'Transaction reference is required'
        });
      }

      const result = await accountService.verifyTransaction(transactionReference);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Verify transaction error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify transaction'
      });
    }
  }

  async getBanks(req, res) {
    try {
      const banks = await accountService.getBanks();

      res.json({
        success: true,
        data: banks
      });

    } catch (error) {
      console.error('Get banks error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch banks'
      });
    }
  }

  async validateBankAccount(req, res) {
    try {
      const { accountNumber, bankCode } = req.body;
      
      if (!accountNumber || !bankCode) {
        return res.status(400).json({
          success: false,
          message: 'Account number and bank code are required'
        });
      }

      const result = await accountService.validateBankAccount(accountNumber, bankCode);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Validate bank account error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to validate bank account'
      });
    }
  }

  async syncMultipleAccounts(req, res) {
    try {
      const { accountIds } = req.body;
      
      if (!accountIds || !Array.isArray(accountIds)) {
        return res.status(400).json({
          success: false,
          message: 'Account IDs array is required'
        });
      }

      const results = await accountService.syncMultipleAccounts(accountIds);

      res.json({
        success: true,
        message: 'Accounts synchronized successfully',
        data: results
      });

    } catch (error) {
      console.error('Sync multiple accounts error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to sync accounts'
      });
    }
  }

  // Test and debug methods
  async testMonnifyConnection(req, res) {
    try {
      const monnifyService = require('../../integrations/monnifyService');
      const result = await monnifyService.testConnection();
      
      res.json({
        success: result.success,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async testBanksList(req, res) {
    try {
      const monnifyService = require('../../integrations/monnifyService');
      const result = await monnifyService.testBanks();
      
      res.json({
        success: result.success,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async debugMonnifyConfig(req, res) {
    try {
      res.json({
        success: true,
        data: {
          baseURL: process.env.MONNIFY_BASE_URL,
          hasApiKey: !!process.env.MONNIFY_API_KEY,
          hasSecretKey: !!process.env.MONNIFY_SECRET_KEY,
          hasContractCode: !!process.env.MONNIFY_CONTRACT_CODE,
          apiKeyPreview: process.env.MONNIFY_API_KEY ? process.env.MONNIFY_API_KEY.substring(0, 15) + '...' : 'NOT SET',
          contractCode: process.env.MONNIFY_CONTRACT_CODE
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AccountController();