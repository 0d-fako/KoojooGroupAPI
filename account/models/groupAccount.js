const mongoose = require('mongoose');

const groupAccountSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  groupId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  monnifyAccountReference: {
    type: String,
    required: true,
    unique: true
  },
  virtualAccountNumber: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  bankCode: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  totalInflow: {
    type: Number,
    default: 0
  },
  totalOutflow: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  monnifyDetails: {
    customerName: String,
    customerEmail: String,
    bvn: String,
    contractCode: String
  },
  lastSyncedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GroupAccount', groupAccountSchema);