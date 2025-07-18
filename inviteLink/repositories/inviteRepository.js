// inviteLink/repositories/inviteRepository.js (Fixed)
const InviteLink = require('../models/inviteLink');
const { INVITE_STATUS } = require('../../groups/enums/enums'); // Added missing import

class InviteRepository {
  async create(inviteData) {
    try {
      const invite = new InviteLink(inviteData);
      return await invite.save();
    } catch (error) {
      throw error;
    }
  }

  async findByInviteId(inviteId) {
    try {
      return await InviteLink.findOne({ inviteId });
    } catch (error) {
      throw error;
    }
  }

  async findByInviteCode(inviteCode) {
    try {
      return await InviteLink.findOne({ inviteCode });
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId) {
    try {
      return await InviteLink.find({ groupId }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findByCreatedBy(createdBy) {
    try {
      return await InviteLink.find({ createdBy }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findByGroupAndCreator(groupId, createdBy) {
    try {
      return await InviteLink.find({ groupId, createdBy }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async update(inviteId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await InviteLink.findOneAndUpdate(
        { inviteId },
        updateData,
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(inviteId) {
    try {
      return await InviteLink.findOneAndDelete({ inviteId });
    } catch (error) {
      throw error;
    }
  }

  async findExpiredInvites() {
    try {
      return await InviteLink.find({
        expiryDate: { $lt: new Date() },
        status: INVITE_STATUS.PENDING
      });
    } catch (error) {
      throw error;
    }
  }

  async findByPhoneNumber(phoneNumber) {
    try {
      return await InviteLink.find({ invitedPhoneNumber: phoneNumber }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async countByGroup(groupId, status = null) {
    try {
      const filter = { groupId };
      if (status) {
        filter.status = status;
      }
      return await InviteLink.countDocuments(filter);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InviteRepository();