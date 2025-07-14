const mongoose = require('mongoose');
const { MEMBER_ROLE, getMemberRoleValues } = require('../../groups/enums/enums');

const groupMembershipSchema = new mongoose.Schema({
  membershipId: { 
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
  role: { 
    type: String, 
    enum: getMemberRoleValues(), 
    default: MEMBER_ROLE.MEMBER 
  },
  payoutPosition: { 
    type: Number, 
    required: true,
    min: 1
  },
  joinedAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  suspendedAt: Date,
  suspensionReason: String,
  totalContributions: { 
    type: Number, 
    default: 0,
    min: 0
  },
  totalPayouts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  missedPayments: { 
    type: Number, 
    default: 0,
    min: 0
  },
  latePayments: { 
    type: Number, 
    default: 0,
    min: 0
  },
  onTimePayments: { 
    type: Number, 
    default: 0,
    min: 0
  },
  memberTrustScore: { 
    type: Number, 
    default: 100,
    min: 0,
    max: 100
  },
  hasReceivedPayout: { 
    type: Boolean, 
    default: false 
  },
  lastPayoutReceived: Date,
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});


groupMembershipSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMembershipSchema.index({ groupId: 1, payoutPosition: 1 });
groupMembershipSchema.index({ userId: 1, isActive: 1 });


groupMembershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('GroupMembership', groupMembershipSchema);
