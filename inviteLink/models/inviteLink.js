const mongoose = require('mongoose');
const { INVITE_STATUS, getInviteStatusValues } = require('../../groups/enums/enums');

const inviteLinkSchema = new mongoose.Schema({
  inviteId: {
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
  createdBy: {
    type: String,
    required: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  invitedPhoneNumber: {
    type: String,
    required: true
  },
  invitedEmail: String,
  status: {
    type: String,
    enum: getInviteStatusValues(),
    default: INVITE_STATUS.PENDING
  },
  usedBy: String,
  usedAt: Date,
  expiryDate: {
    type: Date,
    required: true
  },
  maxUses: {
    type: Number,
    default: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  personalMessage: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


inviteLinkSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('InviteLink', inviteLinkSchema);