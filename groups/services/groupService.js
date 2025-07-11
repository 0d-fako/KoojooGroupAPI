const groupRepository = require('../repositories/groupRepository');
const { v4: uuidv4 } = require('uuid');
const { GROUP_STATUS } = require('../enums/enums');

class GroupService {
  async createGroup(groupData, treasurerId) {
    try {
      
      this.validateGroupData(groupData);

      const group = {
        groupId: uuidv4(),
        ...groupData,
        treasurerId,
        status: GROUP_STATUS.PENDING_ACTIVATION,
        currentMembers: 1, 
        currentCycle: 1,
        currentTurn: 1,
        totalContributions: 0,
        totalPayouts: 0
      };

     
      const createdGroup = await groupRepository.create(group);

    
      return this.formatGroupResponse(createdGroup);

    } catch (error) {
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }

  async getGroupByGroupId(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const group = await groupRepository.findByGroupId(groupId);
      
      if (!group) {
        throw new Error('Group not found');
      }

      return this.formatGroupResponse(group);

    } catch (error) {
      throw error;
    }
  }

  async getAllGroups() {
    try {
      const groups = await groupRepository.findAll();
      
      return groups.map(group => this.formatGroupResponse(group));

    } catch (error) {
      throw error;
    }         
  }

  async getGroupsByTreasurer(treasurerId) {
    try {
      if (!treasurerId) {
        throw new Error('Treasurer ID is required');
      }

      const groups = await groupRepository.findByTreasurerId(treasurerId);
      
      return groups.map(group => this.formatGroupResponse(group));

    } catch (error) {
      throw error;
    }
  }

  async updateGroup(groupId, updateData) {
    try {
    
      this.validateUpdateData(updateData);

      const updatedGroup = await groupRepository.update(groupId, updateData);
      
      if (!updatedGroup) {
        throw new Error('Group not found');
      }

      return this.formatGroupResponse(updatedGroup);

    } catch (error) {
      throw error;
    }
  }

  
  validateGroupData(groupData) {
    const { groupName, contributionAmount, contributionFrequency, requiredMembers, maxMembers } = groupData;

    if (!groupName || groupName.trim().length === 0) {
      throw new Error('Group name is required');
    }

    if (!contributionAmount || contributionAmount < 1000) {
      throw new Error('Minimum contribution amount is 1000 NGN');
    }

    if (!contributionFrequency) {
      throw new Error('Contribution frequency is required');
    }

    if (!requiredMembers || requiredMembers < 2 || requiredMembers > 12) {
      throw new Error('Required members must be between 2 and 12');
    }

    if (!maxMembers || maxMembers < 2 || maxMembers > 12) {
      throw new Error('Max members must be between 2 and 12');
    }

    if (maxMembers < requiredMembers) {
      throw new Error('Max members cannot be less than required members');
    }
  }

  validateUpdateData(updateData) {
   
    const allowedFields = [ 'description', 'contributionAmount'];
    const updateFields = Object.keys(updateData);
    
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields for update: ${invalidFields.join(', ')}`);
    }
  }

  formatGroupResponse(group) {
    return {
      groupId: group.groupId,
      groupName: group.groupName,
      description: group.description,
      treasurerId: group.treasurerId,
      status: group.status,
      contributionAmount: group.contributionAmount,
      contributionFrequency: group.contributionFrequency,
      requiredMembers: group.requiredMembers,
      maxMembers: group.maxMembers,
      currentMembers: group.currentMembers,
      currentCycle: group.currentCycle,
      currentTurn: group.currentTurn,
      totalContributions: group.totalContributions,
      totalPayouts: group.totalPayouts,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  }
}

module.exports = new GroupService()