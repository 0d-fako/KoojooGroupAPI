import mongoose from 'mongoose';

import { GROUP_STATUS } from  '../enums/enums.js';

const groupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    unique: true,
    default: () => `GRP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  groupName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  creatorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  virtualAccountNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  virtualAccountName: {
    type: String
  },
  bankCode: {
    type: String
  },
  contributionAmount: {
    type: Number,
    required: true,
    min: 1000, 
    max: 10000000
  },
  contributionFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'bi-weekly'],
    default: 'monthly'
  },
  maxMembers: {
    type: Number,
    required: true,
    min: 3,
    max: 50
  },
  currentCycle: {
    type: Number,
    default: 1
  },
  totalCycles: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: Object.values(GROUP_STATUS),
    default: GROUP_STATUS.ACTIVE
  },
  groupRules: {
    type: String,
    maxlength: 1000
  },
  penaltyAmount: {
    type: Number,
    default: 0
  },
  latePenaltyDays: {
    type: Number,
    default: 3
  },
  nextPaymentDate: {
    type: Date,
    required: true
  },
  nextPayoutDate: {
    type: Date,
    required: true
  },
  settings: {
    allowEarlyPayment: {
      type: Boolean,
      default: true
    },
    autoSelectRecipient: {
      type: Boolean,
      default: true
    },
    requirePaymentProof: {
      type: Boolean,
      default: false
    },
    enableNotifications: {
      type: Boolean,
      default: true
    }
  },
  totalContributions: {
    type: Number,
    default: 0
  },
  totalPayouts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
groupSchema.virtual('currentBalance').get(function() {
  return this.totalContributions - this.totalPayouts;
});

groupSchema.virtual('isActive').get(function() {
  return this.status === GROUP_STATUS.ACTIVE;
});

// Indexes for performance
groupSchema.index({ creatorId: 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ virtualAccountNumber: 1 });
groupSchema.index({ nextPaymentDate: 1 });

export default mongoose.model('Group', groupSchema);