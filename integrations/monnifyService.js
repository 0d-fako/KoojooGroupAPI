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
        throw new Error('❌ Monnify API Key and Secret Key are required in .env file');
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
        
        // Set token expiry
        const expiresIn = response.data.responseBody.expiresIn
        this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

        return this.accessToken;
      } else {
        const errorMessage = response.data?.responseMessage || 'Authentication failed';
        throw new Error(`Monnify authentication failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error('Authentication error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        url: error.config?.url
      });

      // Handle specific error cases
      if (error.code === 'ENOTFOUND') {
        throw new Error('❌ Cannot connect to Monnify servers. Check your internet connection and base URL.');
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('❌ Connection refused by Monnify servers.');
      }

      if (error.response?.status === 401) {
        throw new Error('❌ Invalid Monnify API credentials. Please verify your API Key and Secret Key.');
      }

      if (error.response?.status === 404) {
        throw new Error('❌ Monnify login endpoint not found. Please verify the base URL.');
      }

      throw new Error(`❌ Failed to authenticate with Monnify: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async createReservedAccount(accountData) {
    try {
      console.log('🏦 Starting reserved account creation...');
      
      // Get access token
      const accessToken = await this.getAccessToken();

      // Prepare payload according to Monnify documentation
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
        throw new Error('❌ Either BVN or NIN is required for account creation');
      }

      if (!payload.contractCode) {
        throw new Error('❌ Contract Code is required. Please set MONNIFY_CONTRACT_CODE in your .env file');
      }

      
      // Make API call to create reserved account
      const createUrl = `${this.baseURL}/api/v2/bank-transfer/reserved-accounts`;
      
      const response = await axios.post(createUrl, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 25000 
      });
      
      // Check if account creation was successful
      if (response.data && response.data.requestSuccessful === true) {
        console.log('✅ Reserved account created successfully!');
        console.log('🏦 Account Details:', {
          accountReference: response.data.responseBody.accountReference,
          reservationReference: response.data.responseBody.reservationReference,
          accountCount: response.data.responseBody.accounts?.length || 0
        });

        return response.data.responseBody;
      } else {
        const errorMessage = response.data?.responseMessage || 'Account creation failed';
        console.log('❌ Account creation failed:', errorMessage);
        throw new Error(`Account creation failed: ${errorMessage}`);
      }

    } catch (error) {
      console.error('💥 Account creation error:', {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });

      // Handle specific error cases
      if (error.response?.status === 401) {
        // Token might have expired, clear it and retry once
        this.accessToken = null;
        this.tokenExpiry = null;
        throw new Error('❌ Authentication expired. Please try again.');
      }

      if (error.response?.status === 400) {
        const errorDetails = error.response.data?.responseMessage || 'Invalid request parameters';
        throw new Error(`❌ Bad request: ${errorDetails}`);
      }

      throw new Error(`❌ Failed to create reserved account: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async getReservedAccountDetails(accountReference) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/api/v2/bank-transfer/reserved-accounts/${accountReference}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to get account details');
      }

    } catch (error) {
      throw new Error(`Failed to get reserved account details: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async getAccountTransactions(accountReference, page = 0, size = 10) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/api/v2/bank-transfer/reserved-accounts/${accountReference}/transactions`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: { page, size },
          timeout: 15000
        }
      );

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to get transactions');
      }

    } catch (error) {
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
      throw new Error(`Failed to get banks: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async validateBankAccount(accountNumber, bankCode) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/api/v1/disbursements/account/validate`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: { accountNumber, bankCode },
          timeout: 15000
        }
      );

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to validate account');
      }

    } catch (error) {
      throw new Error(`Failed to validate bank account: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  async verifyTransaction(transactionReference) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/api/v2/transactions/${transactionReference}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.requestSuccessful === true) {
        return response.data.responseBody;
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to verify transaction');
      }

    } catch (error) {
      throw new Error(`Failed to verify transaction: ${error.response?.data?.responseMessage || error.message}`);
    }
  }

  // Test connection method
  async testConnection() {
    try {
      console.log('🧪 Testing Monnify connection...');
      const token = await this.getAccessToken();
      
      return { 
        success: true, 
        message: '✅ Monnify connection successful!', 
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
        message: `❌ Connection failed: ${error.message}`,
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