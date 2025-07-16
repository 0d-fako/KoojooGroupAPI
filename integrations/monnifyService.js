// integrations/monnifyService.js - Cleaned & Complete
const axios = require('axios');

class MonnifyService {
  constructor() {
    this.baseURL = process.env.MONNIFY_BASE_URL;
    this.apiKey = process.env.MONNIFY_API_KEY;
    this.secretKey = process.env.MONNIFY_SECRET_KEY;
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        console.log('✅ Using cached access token');
        return this.accessToken;
      }

      // Validate credentials
      if (!this.apiKey || !this.secretKey) {
        throw new Error('Monnify API Key and Secret Key are required in .env file');
      }

      // Encode credentials for Basic Auth
      const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');
      const loginUrl = `${this.baseURL}/api/v1/auth/login`;

      const response = await axios.post(loginUrl, {}, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      // Check if login was successful
      if (response.data && response.data.requestSuccessful === true) {
        this.accessToken = response.data.responseBody.accessToken;
        
        // Set token expiry (subtract 5 minutes for safety)
        const expiresIn = response.data.responseBody.expiresIn;
        this.tokenExpiry = new Date(Date.now() + ((expiresIn - 300) * 1000));

        console.log('✅ New access token obtained');
        return this.accessToken;
      } else {
        const errorMessage = response.data?.responseMessage || 'Authentication failed';
        throw new Error(`Monnify authentication failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error('💥 Authentication error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });

      // Clear cached token on auth failure
      this.accessToken = null;
      this.tokenExpiry = null;

      // Handle specific error cases
      if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to Monnify servers. Check your internet connection and base URL');
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused by Monnify servers');
      }

      if (error.response?.status === 401) {
        throw new Error('Invalid Monnify API credentials. Please verify your API Key and Secret Key');
      }

      if (error.response?.status === 404) {
        throw new Error('Monnify login endpoint not found. Please verify the base URL');
      }

      throw new Error(`Failed to authenticate with Monnify: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async createReservedAccount(accountData) {
    try {
      console.log('🏦 Creating reserved account...');
      
      const accessToken = await this.getAccessToken();

      // Prepare payload
      const payload = {
        accountReference: accountData.accountReference,
        accountName: accountData.accountName,
        currencyCode: accountData.currencyCode || 'NGN',
        contractCode: accountData.contractCode || this.contractCode,
        customerEmail: accountData.customerEmail,
        customerName: accountData.customerName || accountData.accountName,
        getAllAvailableBanks: true,
        restrictPaymentSource: accountData.restrictPaymentSource || false
      };

      // Add BVN or NIN (one is required)
      if (accountData.bvn) {
        payload.bvn = accountData.bvn;
      }
      if (accountData.nin) {
        payload.nin = accountData.nin;
      }

      // Validate required fields
      if (!payload.bvn && !payload.nin) {
        throw new Error('Either BVN or NIN is required for account creation');
      }

      if (!payload.contractCode) {
        throw new Error('Contract Code is required. Please set MONNIFY_CONTRACT_CODE in your .env file');
      }

      // Make API call
      const response = await axios.post(`${this.baseURL}/api/v2/bank-transfer/reserved-accounts`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 25000
      });
      
      if (response.data && response.data.requestSuccessful === true) {
        console.log('✅ Reserved account created successfully');
        return response.data.responseBody;
      } else {
        const errorMessage = response.data?.responseMessage || 'Account creation failed';
        throw new Error(`Account creation failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error('💥 Account creation failed:', {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data?.responseMessage
      });

      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
        throw new Error('Authentication expired. Please try again');
      }

      if (error.response?.status === 400) {
        const errorDetails = error.response.data?.responseMessage || 'Invalid request parameters';
        throw new Error(`Bad request: ${errorDetails}`);
      }

      throw new Error(`Failed to create reserved account: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async deallocateReservedAccount(accountReference) {
    try {
      console.log('🗑️ Deallocating reserved account:', accountReference);
      
      const accessToken = await this.getAccessToken();
      
      const response = await axios.delete(`${this.baseURL}/api/v1/bank-transfer/reserved-accounts/reference/${accountReference}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      });
      
      if (response.data && response.data.requestSuccessful === true) {
        console.log('✅ Reserved account deallocated successfully');
        return {
          success: true,
          message: 'Account deallocated successfully',
          accountReference: accountReference
        };
      } else {
        const errorMessage = response.data?.responseMessage || 'Deallocation failed';
        
        if (errorMessage.includes('Cannot find reserved account')) {
          console.log('⚠️ Account already deallocated or not found');
          return {
            success: true,
            message: 'Account already deallocated or not found',
            accountReference: accountReference
          };
        }
        
        throw new Error(`Deallocation failed: ${errorMessage}`);
      }
      
    } catch (error) {
      console.error('💥 Account deallocation failed:', {
        accountReference,
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data?.responseMessage
      });
      
      if (error.response?.status === 404) {
        console.log('⚠️ Account not found - may already be deallocated');
        return {
          success: true,
          message: 'Account not found - may already be deallocated',
          accountReference: accountReference
        };
      }
      
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
        throw new Error('Authentication failed - check Monnify credentials');
      }
      
      throw new Error(`Failed to deallocate account: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async getReservedAccountDetails(accountReference) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseURL}/api/v2/bank-transfer/reserved-accounts/${accountReference}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to get account details');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw new Error(`Failed to get reserved account details: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async getAccountTransactions(accountReference, page = 0, size = 10) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseURL}/api/v2/bank-transfer/reserved-accounts/${accountReference}/transactions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { page, size },
        timeout: 15000
      });

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to get transactions');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw new Error(`Failed to get account transactions: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async getBanks() {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseURL}/api/v1/banks`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to get banks');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw new Error(`Failed to get banks: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async validateBankAccount(accountNumber, bankCode) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseURL}/api/v1/disbursements/account/validate`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { accountNumber, bankCode },
        timeout: 15000
      });

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to validate account');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw new Error(`Failed to validate bank account: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async verifyTransaction(transactionReference) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseURL}/api/v2/transactions/${transactionReference}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to verify transaction');
      }

    } catch (error) {
      if (error.response?.status === 401) {
        this.accessToken = null;
        this.tokenExpiry = null;
      }
      throw new Error(`Failed to verify transaction: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Monnify connection...');
      const token = await this.getAccessToken();
      
      return { 
        success: true, 
        message: 'Monnify connection successful', 
        data: {
          tokenPreview: token.substring(0, 30) + '...',
          baseURL: this.baseURL,
          contractCode: this.contractCode
        }
      };
    } catch (error) {
      console.error('💥 Connection test failed:', error.message);
      return { 
        success: false, 
        message: `Connection failed: ${error.message}`,
        data: {
          baseURL: this.baseURL,
          hasApiKey: !!this.apiKey,
          hasSecretKey: !!this.secretKey,
          hasContractCode: !!this.contractCode
        }
      };
    }
  }
}

module.exports = new MonnifyService();