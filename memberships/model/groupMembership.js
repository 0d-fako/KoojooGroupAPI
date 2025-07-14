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
    required: true
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
    default: 0
  },
  totalPayouts: {
    type: Number,
    default: 0
  },
  missedPayments: {
    type: Number,
    default: 0
  },
  latePayments: {
    type: Number,
    default: 0
  },
  onTimePayments: {
    type: Number,
    default: 0
  },
  memberTrustScore: {
    type: Number,
    default: 100
  },
  hasReceivedPayout: {
    type: Boolean,
    default: false
  },
  lastPayoutReceived: Date,
  notes: String,
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

module.exports = mongoose.model('GroupMembership', groupMembershipSchema);