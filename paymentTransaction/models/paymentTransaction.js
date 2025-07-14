const mongoose = require('mongoose');
const { PAYMENT_STATUS, TRANSACTION_TYPE, getPaymentStatusValues, getTransactionTypeValues } = require('../../groups/enums/enums');

const paymentTransactionSchema = new mongoose.Schema({
  transactionId: {
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
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: getTransactionTypeValues(),
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
  cycle: {
    type: Number,
    required: true
  },
  turn: {
    type: Number,
    required: true
  },
  dueDate: Date,
  paidAt: Date,
  isLate: {
    type: Boolean,
    default: false
  },
  daysPastDue: {
    type: Number,
    default: 0
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },
  monnifyReference: String,
  paymentReference: String,
  paymentMethod: String,
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

paymentTransactionSchema.index({ groupId: 1, cycle: 1, turn: 1 });
paymentTransactionSchema.index({ userId: 1, status: 1 });
paymentTransactionSchema.index({ dueDate: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);