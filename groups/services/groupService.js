
const groupRepository = require('../repositories/groupRepository');
const membershipService = require('../../memberships/services/membershipService');
const accountService = require('../../accounts/services/accountService');
const inviteService = require('../../inviteLink/services/inviteService');
const { v4: uuidv4 } = require('uuid');
const { GROUP_STATUS, MEMBER_ROLE } = require('../enums/enums');

class GroupService {
  
  async createGroup(groupData, treasurerId, treasurerData) {
    try {
      console.log('🚀 Creating new thrift group...');
      
  
      this.validateGroupCreationData(groupData, treasurerId, treasurerData);
      
      
      const group = await this.createGroupRecord(groupData, treasurerId);
      console.log('✅ Group record created:', group.groupId);
      
      // Step 3: Create virtual account (can fail, but group exists)
      const virtualAccount = await this.createVirtualAccount(group.groupId, treasurerData.accountData);
      console.log('✅ Virtual account created');
      
      // Step 4: Add treasurer as first member
      const treasurerMembership = await this.addTreasurerMembership(group.groupId, treasurerId);
      console.log('✅ Treasurer membership created');
      
      // Step 5: Generate first invite link
      const firstInvite = await this.generateInitialInvite(group.groupId, treasurerId, treasurerData);
      console.log('✅ Initial invite link generated');
      
      return {
        group: this.formatGroupResponse(group),
        virtualAccount: this.formatAccountResponse(virtualAccount),
        treasurerMembership,
        firstInviteLink: firstInvite
      };
      
    } catch (error) {
      console.error('💥 Group creation failed:', error.message);
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }
  
  async createGroupRecord(groupData, treasurerId) {
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
    
    return await groupRepository.create(group);
  }
  
  async createVirtualAccount(groupId, accountData) {
    try {
      return await accountService.createGroupAccount(groupId, accountData);
    } catch (error) {
      console.warn('⚠️ Virtual account creation failed, but group was created:', error.message);
      
      throw error;
    }
  }
  
  async addTreasurerMembership(groupId, treasurerId) {
    return await membershipService.createMembership({
      groupId,
      userId: treasurerId,
      role: MEMBER_ROLE.TREASURER,
      payoutPosition: 1, // Treasurer gets first payout position
      memberTrustScore: 100 // Treasurer starts with perfect score
    });
  }
  
  async generateInitialInvite(groupId, treasurerId, treasurerData) {
    const inviteData = {
      phoneNumber: treasurerData.phoneNumber,
      email: treasurerData.email,
      personalMessage: `Join my thrift group and start saving together!`,
      maxUses: 1
    };
    
    return await inviteService.generateInviteLink(groupId, inviteData, treasurerId);
  }
  

  async activateGroup(groupId, activatedBy) {
    try {
      console.log('🎯 Activating group:', groupId);
      
      const group = await this.getGroupByGroupId(groupId);
      
      // Validation checks
      this.validateGroupActivation(group);
      
      // Initialize payout order
      await this.initializePayoutOrder(groupId);
      
      // Calculate next payout date
      const nextPayoutDate = this.calculateNextPayoutDate(group.contributionFrequency);
      
      // Update group status
      const updateData = {
        status: GROUP_STATUS.ACTIVE,
        activatedAt: new Date(),
        nextPayoutDate,
        activatedBy
      };
      
      const activatedGroup = await groupRepository.update(groupId, updateData);
      console.log('✅ Group activated successfully!');
      
      return this.formatGroupResponse(activatedGroup);
      
    } catch (error) {
      throw new Error(`Failed to activate group: ${error.message}`);
    }
  }
  
  validateGroupActivation(group) {
    if (group.status !== GROUP_STATUS.PENDING_ACTIVATION) {
      throw new Error('Group is not in pending activation state');
    }
    
    if (group.currentMembers < group.requiredMembers) {
      throw new Error(`Cannot activate group: Need ${group.requiredMembers} members, only have ${group.currentMembers}`);
    }
  }
  
 
  async addMemberToGroup(groupId, userId, inviteCode) {
    try {
      console.log('👥 Adding member to group:', { groupId, userId });
      
      const group = await this.getGroupByGroupId(groupId);
      
      if (group.currentMembers >= group.maxMembers) {
        throw new Error('Group is already at maximum capacity');
      }
      
      // Validate invite and create membership
      const joinResult = await inviteService.validateAndUseInvite(inviteCode, { userId });
      
      if (!joinResult.membershipCreated) {
        throw new Error('Failed to create membership');
      }
      
      // Update group member count
      const updateData = {
        currentMembers: group.currentMembers + 1
      };
      
      // Auto-activate if requirements are met
      if (updateData.currentMembers >= group.requiredMembers && group.status === GROUP_STATUS.PENDING_ACTIVATION) {
        updateData.status = GROUP_STATUS.ACTIVE;
        updateData.activatedAt = new Date();
        updateData.nextPayoutDate = this.calculateNextPayoutDate(group.contributionFrequency);
        
        // Initialize payout order when group becomes active
        await this.initializePayoutOrder(groupId);
      }
      
      const updatedGroup = await groupRepository.update(groupId, updateData);
      
      return {
        group: this.formatGroupResponse(updatedGroup),
        membershipCreated: true,
        payoutPosition: joinResult.payoutPosition,
        autoActivated: updateData.status === GROUP_STATUS.ACTIVE
      };
      
    } catch (error) {
      throw new Error(`Failed to add member to group: ${error.message}`);
    }
  }
  

  async initializePayoutOrder(groupId) {
    try {
      console.log('🔄 Initializing payout order...');
      
      const members = await membershipService.getGroupMemberships(groupId);
      
      if (members.length === 0) {
        throw new Error('No members found in group');
      }
      
      // Simple random shuffle for now (can enhance with trust scores later)
      const shuffledMembers = this.shuffleArray([...members]);
      
      
      for (let i = 0; i < shuffledMembers.length; i++) {
        await membershipService.updatePayoutPosition(shuffledMembers[i].membershipId, i + 1);
      }
      
      console.log('✅ Payout order initialized');
      return shuffledMembers.map((m, index) => ({
        userId: m.userId,
        position: index + 1,
        membershipId: m.membershipId
      }));
      
    } catch (error) {
      throw new Error(`Failed to initialize payout order: ${error.message}`);
    }
  }
  
  async advanceToNextTurn(groupId) {
    try {
      console.log('⏭️ Advancing to next turn for group:', groupId);
      
      const group = await this.getGroupByGroupId(groupId);
      
      if (group.status !== GROUP_STATUS.ACTIVE) {
        throw new Error('Group is not active');
      }
      
      // Calculate next turn/cycle
      let nextTurn = group.currentTurn + 1;
      let nextCycle = group.currentCycle;
      
      // Check if cycle is complete
      if (nextTurn > group.currentMembers) {
        nextTurn = 1;
        nextCycle = group.currentCycle + 1;
        console.log('🔄 Starting new cycle:', nextCycle);
      }
      
      const nextPayoutDate = this.calculateNextPayoutDate(group.contributionFrequency);
      
      const updateData = {
        currentTurn: nextTurn,
        currentCycle: nextCycle,
        nextPayoutDate,
        lastPayoutDate: new Date()
      };
      
      const updatedGroup = await groupRepository.update(groupId, updateData);
      
      console.log('✅ Turn advanced successfully!');
      return this.formatGroupResponse(updatedGroup);
      
    } catch (error) {
      throw new Error(`Failed to advance to next turn: ${error.message}`);
    }
  }
  

  async getGroupByGroupId(groupId) {
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    
    const group = await groupRepository.findByGroupId(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    return this.formatGroupResponse(group);
  }
  
  async getAllGroups() {
    const groups = await groupRepository.findAll();
    return groups.map(group => this.formatGroupResponse(group));
  }
  
  async getGroupsByTreasurer(treasurerId) {
    if (!treasurerId) {
      throw new Error('Treasurer ID is required');
    }
    
    const groups = await groupRepository.findByTreasurerId(treasurerId);
    return groups.map(group => this.formatGroupResponse(group));
  }
  
  async updateGroup(groupId, updateData) {
    this.validateGroupUpdate(updateData);
    
    const updatedGroup = await groupRepository.update(groupId, updateData);
    
    if (!updatedGroup) {
      throw new Error('Group not found');
    }
    
    return this.formatGroupResponse(updatedGroup);
  }
  

  calculateNextPayoutDate(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'bi_weekly':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'quarterly':
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter;
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
  
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
 
  validateGroupCreationData(groupData, treasurerId, treasurerData) {
    // Group data validation
    this.validateGroupData(groupData);
    
    // Treasurer validation
    if (!treasurerId?.trim()) {
      throw new Error('Treasurer ID is required');
    }
    
    // Treasurer data validation
    this.validateTreasurerData(treasurerData);
  }
  
  validateGroupData(groupData) {
    const { groupName, contributionAmount, contributionFrequency, requiredMembers, maxMembers } = groupData;
    
    if (!groupName?.trim()) {
      throw new Error('Group name is required');
    }
    
    if (!contributionAmount || contributionAmount < 1000) {
      throw new Error('Minimum contribution amount is ₦1,000');
    }
    
    if (!contributionFrequency) {
      throw new Error('Contribution frequency is required');
    }
    
    if (!requiredMembers || requiredMembers < 2 || requiredMembers > 50) {
      throw new Error('Required members must be between 2 and 50');
    }
    
    if (!maxMembers || maxMembers < 2 || maxMembers > 50) {
      throw new Error('Max members must be between 2 and 50');
    }
    
    if (maxMembers < requiredMembers) {
      throw new Error('Max members cannot be less than required members');
    }
  }
  
  validateTreasurerData(treasurerData) {
    if (!treasurerData?.phoneNumber) {
      throw new Error('Treasurer phone number is required');
    }
    
    if (!treasurerData?.accountData) {
      throw new Error('Treasurer account data is required for virtual account creation');
    }
    
    if (!treasurerData.accountData.customerEmail) {
      throw new Error('Treasurer email is required for virtual account');
    }
    
    if (!treasurerData.accountData.bvn && !treasurerData.accountData.nin) {
      throw new Error('Treasurer BVN or NIN is required for virtual account');
    }
  }
  
  validateGroupUpdate(updateData) {
    const allowedFields = ['description', 'contributionAmount', 'status'];
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
      nextPayoutDate: group.nextPayoutDate,
      lastPayoutDate: group.lastPayoutDate,
      activatedAt: group.activatedAt,
      activatedBy: group.activatedBy,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };
  }
  
  formatAccountResponse(virtualAccount) {
    return {
      accountId: virtualAccount.accountId,
      accountNumber: virtualAccount.virtualAccountNumber,
      bankName: virtualAccount.bankName,
      accountName: virtualAccount.accountName,
      isActive: virtualAccount.isActive
    };
  }
}

module.exports = new GroupService();