// accounts/routes/accountRoutes.js (Final version)
const express = require('express');
const AccountController = require('../controllers/accountController');

const router = express.Router();

// Test and debug endpoints (put these first to avoid conflicts)
router.get('/test/monnify', AccountController.testMonnifyConnection);
router.get('/test/banks', AccountController.testBanksList);
router.get('/debug/config', AccountController.debugMonnifyConfig);

// Create account
router.post('/', AccountController.createAccount);

// Get all accounts
router.get('/', AccountController.getAllAccounts);

// Get specific account
router.get('/:accountId', AccountController.getAccount);

// Get account by group ID
router.get('/group/:groupId', AccountController.getAccountByGroup);

// Get account by account number
router.get('/number/:accountNumber', AccountController.getAccountByNumber);

// Get account summary
router.get('/group/:groupId/summary', AccountController.getAccountSummary);

// Get account transactions from Monnify
router.get('/group/:groupId/transactions', AccountController.getAccountTransactions);

// Update account
router.put('/:accountId', AccountController.updateAccount);

// Update account balance (manual adjustment)
router.patch('/group/:groupId/balance', AccountController.updateBalance);

// Sync account balance with Monnify
router.post('/group/:groupId/sync', AccountController.syncBalance);

// Sync multiple accounts
router.post('/sync/multiple', AccountController.syncMultipleAccounts);

// Deactivate account
router.patch('/:accountId/deactivate', AccountController.deactivateAccount);

// Activate account
router.patch('/:accountId/activate', AccountController.activateAccount);

// Verify Monnify transaction
router.get('/verify/:transactionReference', AccountController.verifyMonnifyTransaction);

// Get system-wide totals (admin endpoint)
router.get('/admin/totals', AccountController.getSystemTotals);

// Utility endpoints for Monnify integration
router.get('/utils/banks', AccountController.getBanks);
router.post('/utils/validate-bank', AccountController.validateBankAccount);

module.exports = router;