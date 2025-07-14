const mongoose = require('mongoose');
const { PAYMENT_STATUS, getPaymentStatusValues } = require('../../groups/enums/enums');

const payoutTransactionSchema = new mongoose.Schema({
  payoutId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  groupId: {
    type: String,
    required: true,
    index: true
  },
  recipientUserId: {
    type: String,
    required: true,
    index: true
  },
  cycle: {
    type: Number,
    required: true
  },
  turn: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: getPaymentStatusValues(),
    default: PAYMENT_STATUS.PENDING
  },
  scheduledDate: Date,
  disbursedAt: Date,
  monnifyTransferReference: String,
  bankDetails: {
    accountNumber: String,
    bankCode: String,
    accountName: String
  },
  failureReason: String,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  approvedBy: String,
  approvedAt: Date,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


payoutTransactionSchema.index({ groupId: 1, cycle: 1, turn: 1 });
payoutTransactionSchema.index({ recipientUserId: 1, status: 1 });
payoutTransactionSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('PayoutTransaction', payoutTransactionSchema);