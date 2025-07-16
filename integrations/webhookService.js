const crypto = require('crypto');
const sha512 = require('js-sha512').sha512;
const paymentService = require('../paymentTransaction/services/paymentService');
const accountService = require('../accounts/services/accountService');

class WebhookService {
  
  async handleMonnifyWebhook(webhookData, signature) {
    try {
      
      const isValid = this.verifySignature(webhookData, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      
      // Step 2: Check for duplicates
      if (this.isDuplicateWebhook(webhookData)) {
        return { success: true, message: 'Duplicate ignored' };
      }
      
      // Step 3: Process based on event type
      let result;
      switch (webhookData.eventType) {
        case 'SUCCESSFUL_TRANSACTION':
          result = await this.processSuccessfulTransaction(webhookData.eventData);
          break;
        case 'SUCCESSFUL_DISBURSEMENT':
          result = await this.processSuccessfulDisbursement(webhookData.eventData);
          break;
        case 'FAILED_DISBURSEMENT':
          result = await this.processFailedDisbursement(webhookData.eventData);
          break;
        default:
          result = { success: true, message: 'Event type not handled' };
      }
      
      // Step 4: Log successful processing
      this.logWebhook(webhookData, 'success');
      
      return result;
      
    } catch (error) {
      this.logWebhook(webhookData, 'failed', error.message);
      throw error;
    }
  }
  
  verifySignature(webhookData, signature) {
    try {
      if (!signature || !webhookData) {
        return false;
      }
      
      const clientSecret = process.env.MONNIFY_SECRET_KEY;
      if (!clientSecret) {
        console.error('❌ MONNIFY_SECRET_KEY not configured');
        return false;
      }
      
      const stringifiedData = JSON.stringify(webhookData);
      const computedHash = sha512.hmac(clientSecret, stringifiedData);
      
      return computedHash === signature;
      
    } catch (error) {
      console.error('❌ Signature verification error:', error.message);
      return false;
    }
  }
  
  isDuplicateWebhook(webhookData) {
    const transactionRef = webhookData.eventData?.transactionReference;
    if (!transactionRef) return false;
    
    // Simple duplicate check using in-memory logs
    const logs = global.webhookLogs || [];
    return logs.some(log => 
      log.transactionReference === transactionRef && 
      log.eventType === webhookData.eventType &&
      log.status === 'success'
    );
  }
  
  async processSuccessfulTransaction(eventData) {
    try {
      console.log('💰 Processing successful transaction...');
      
      // Extract payment details
      const amount = parseFloat(eventData.amountPaid);
      const accountNumber = eventData.destinationAccountInformation?.accountNumber;
      const transactionRef = eventData.transactionReference;
      
      if (!amount || !accountNumber || !transactionRef) {
        throw new Error('Missing required transaction data');
      }
      
      // Find the group account
      const account = await accountService.getAccountByAccountNumber(accountNumber);
      if (!account) {
        throw new Error(`Account not found: ${accountNumber}`);
      }
      
      // Find matching pending payment
      const groupPayments = await paymentService.getGroupPayments(account.groupId);
      const pendingPayment = groupPayments.find(p => 
        p.status === 'pending' && 
        Math.abs(p.amount - amount) < 0.01
      );
      
      if (!pendingPayment) {
        throw new Error(`No pending payment found for ₦${amount.toLocaleString()}`);
      }
      
      // Process the payment
      const result = await paymentService.processPayment(
        pendingPayment.transactionId,
        transactionRef,
        amount
      );
      
      console.log('✅ Transaction processed successfully');
      
      return {
        success: true,
        message: 'Payment processed',
        transactionId: pendingPayment.transactionId,
        groupId: account.groupId,
        amount: amount
      };
      
    } catch (error) {
      console.error('💥 Transaction processing failed:', error.message);
      throw error;
    }
  }
  
  async processSuccessfulDisbursement(eventData) {
    try {
      console.log('💸 Processing successful disbursement...');
      
      // Handle payout completion
      const reference = eventData.reference;
      const amount = eventData.amount;
      
      console.log(`✅ Disbursement completed: ${reference} - ₦${amount?.toLocaleString()}`);
      
      return {
        success: true,
        message: 'Disbursement processed',
        reference: reference,
        amount: amount
      };
      
    } catch (error) {
      console.error('💥 Disbursement processing failed:', error.message);
      throw error;
    }
  }
  
  async processFailedDisbursement(eventData) {
    try {
      console.log('❌ Processing failed disbursement...');
      
      const reference = eventData.reference;
      const reason = eventData.failureReason || 'Unknown reason';
      
      console.log(`❌ Disbursement failed: ${reference} - ${reason}`);
      
      return {
        success: true,
        message: 'Failed disbursement processed',
        reference: reference,
        reason: reason
      };
      
    } catch (error) {
      console.error('💥 Failed disbursement processing error:', error.message);
      throw error;
    }
  }
  
  logWebhook(webhookData, status, error = null) {
    const logEntry = {
      eventType: webhookData?.eventType,
      status,
      timestamp: new Date(),
      transactionReference: webhookData?.eventData?.transactionReference,
      error
    };
    
    console.log('📝 Webhook logged:', {
      eventType: logEntry.eventType,
      status: logEntry.status,
      transactionReference: logEntry.transactionReference
    });
    
    // Store in memory
    if (!global.webhookLogs) global.webhookLogs = [];
    global.webhookLogs.push(logEntry);
    
    // Keep only last 100 logs
    if (global.webhookLogs.length > 100) {
      global.webhookLogs = global.webhookLogs.slice(-100);
    }
  }
  
  getWebhookStats() {
    const logs = global.webhookLogs || [];
    return {
      total: logs.length,
      successful: logs.filter(l => l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed').length,
      lastProcessed: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      recentLogs: logs.slice(-10)
    };
  }
}

module.exports = new WebhookService();