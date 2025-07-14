const GroupMembership = require('../model/groupMembership');

class MembershipRepository {
  async create(membershipData) {
    try {
      const membership = new GroupMembership(membershipData);
      return await membership.save();
    } catch (error) {
      throw error;
    }
  }

  async findByMembershipId(membershipId) {
    try {
      return await GroupMembership.findOne({ membershipId });
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      return await GroupMembership.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId, includeInactive = false) {
    try {
      const filter = { groupId };
      if (!includeInactive) {
        filter.isActive = true;
      }
      return await GroupMembership.find(filter).sort({ payoutPosition: 1 });
    } catch (error) {
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      return await GroupMembership.find({ 
        userId, 
        isActive: true 
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findByUserAndGroup(userId, groupId) {
    try {
      return await GroupMembership.findOne({ userId, groupId });
    } catch (error) {
      throw error;
    }
  }

  async update(membershipId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await GroupMembership.findOneAndUpdate(
        { membershipId }, 
        updateData, 
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(membershipId) {
    try {
      return await GroupMembership.findOneAndDelete({ membershipId });
    } catch (error) {
      throw error;
    }
  }

  async findByRole(role, groupId = null) {
    try {
      const filter = { role, isActive: true };
      if (groupId) {
        filter.groupId = groupId;
      }
      return await GroupMembership.find(filter).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async countByGroup(groupId, activeOnly = true) {
    try {
      const filter = { groupId };
      if (activeOnly) {
        filter.isActive = true;
      }
      return await GroupMembership.countDocuments(filter);
    } catch (error) {
      throw error;
    }
  }

  async findByPayoutPosition(groupId, payoutPosition) {
    try {
      return await GroupMembership.findOne({ 
        groupId, 
        payoutPosition, 
        isActive: true 
      });
    } catch (error) {
      throw error;
    }
  }

  async getNextPayoutPosition(groupId) {
    try {
      const highestPosition = await GroupMembership.findOne({ 
        groupId, 
        isActive: true 
      }).sort({ payoutPosition: -1 }).select('payoutPosition');
      
      return highestPosition ? highestPosition.payoutPosition + 1 : 1;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MembershipRepository();