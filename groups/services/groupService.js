// groups/services/groupService.js (Enhanced Version)
const groupRepository = require('../repositories/groupRepository');
const membershipService = require('../../memberships/services/membershipService');
const accountService = require('../../accounts/services/accountService');
const inviteService = require('../../inviteLink/services/inviteService');
const paymentService = require('../../paymentTransaction/services/paymentService');
const payoutService = require('../../payoutTransaction/services/payoutService');
const { v4: uuidv4 } = require('uuid');
const { GROUP_STATUS, MEMBER_ROLE } = require('../enums/enums');

class GroupService {
  async createGroup(groupData, treasurerId, treasurerData) {
    try {
    
      
      // Validate input data
      this.validateGroupData(groupData);
      this.validateTreasurerData(treasurerData);

      const group = {
        groupId: uuidv4(),
        ...groupData,
        treasurerId,
        status: GROUP_STATUS.PENDING_ACTIVATION,
        currentMembers: 1,
        currentCycle: 1,
        currentTurn: 1,
        totalContributions: 0,
        totalPayouts: 0,
        activatedAt: null,
        nextPayoutDate: null
      };

     
      const createdGroup = await groupRepository.create(group);

     
      // Create virtual account immediately
      const virtualAccount = await accountService.createGroupAccount(
        createdGroup.groupId,
        treasurerData.accountData
      );

    
      // Add treasurer as first member with full privileges
      const treasurerMembership = await membershipService.createMembership({
        groupId: createdGroup.groupId,
        userId: treasurerId,
        role: MEMBER_ROLE.TREASURER,
        payoutPosition: 1, 
        memberTrustScore: 100 
      });

      
      // Generate first invite link
      const firstInvite = await inviteService.generateInviteLink(
        createdGroup.groupId,
        {
          phoneNumber: treasurerData.phoneNumber,
          email: treasurerData.email,
          personalMessage: `Join ${createdGroup.groupName} thrift group!`
        },
        treasurerId
      );

     

      return {
        group: this.formatGroupResponse(createdGroup),
        virtualAccount: {
          accountId: virtualAccount.accountId,
          accountNumber: virtualAccount.virtualAccountNumber,
          bankName: virtualAccount.bankName,
          accountName: virtualAccount.accountName
        },
        treasurerMembership: treasurerMembership,
        firstInviteLink: firstInvite
      };

    } catch (error) {
      console.error('💥 Group creation failed:', error.message);
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }

  async activateGroup(groupId, activatedBy) {
    try {
      console.log('🎯 Activating group:', groupId);

      const group = await groupRepository.findByGroupId(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.status !== GROUP_STATUS.PENDING_ACTIVATION) {
        throw new Error('Group is not in pending activation state');
      }

      if (group.currentMembers < group.requiredMembers) {
        throw new Error(`Cannot activate group: Need ${group.requiredMembers} members, only have ${group.currentMembers}`);
      }

      
      
      await this.initializePayoutOrder(groupId);

  
      const nextPayoutDate = this.calculateNextPayoutDate(group.contributionFrequency);

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

  async initializePayoutOrder(groupId) {
    try {
      console.log('🔄 Initializing payout order with trust-score randomization...');

      // Get all active members
      const members = await membershipService.getGroupMemberships(groupId);
      
      if (members.length === 0) {
        throw new Error('No members found in group');
      }

      // Sort members by trust score-based weighted random selection
      const payoutOrder = this.generateTrustScoreBasedOrder(members);

      // Update payout positions
      for (let i = 0; i < payoutOrder.length; i++) {
        await membershipService.updatePayoutPosition(
          payoutOrder[i].membershipId,
          i + 1
        );
      }

      console.log('✅ Payout order initialized:', payoutOrder.map(m => ({
        userId: m.userId,
        position: m.payoutPosition,
        trustScore: m.memberTrustScore
      })));

      return payoutOrder;

    } catch (error) {
      throw new Error(`Failed to initialize payout order: ${error.message}`);
    }
  }

  generateTrustScoreBasedOrder(members) {
    console.log('🎯 Generating trust-score-based payout order...');

    // Create weighted array based on trust scores
    const weightedMembers = members.map(member => ({
      ...member,
      weight: this.calculatePayoutWeight(member.memberTrustScore)
    }));

    // Sort by weight (higher trust score = higher chance of earlier payout)
    weightedMembers.sort((a, b) => b.weight - a.weight);

    // Add some randomization while respecting trust scores
    const shuffledOrder = this.weightedShuffle(weightedMembers);

    console.log('📊 Trust-score-based order generated:', shuffledOrder.map(m => ({
      userId: m.userId,
      trustScore: m.memberTrustScore,
      weight: m.weight
    })));

    return shuffledOrder;
  }

  calculatePayoutWeight(trustScore) {
    // Higher trust score = higher weight = better chance of early payout
    // Trust score 100 = weight 100, Trust score 50 = weight 50, etc.
    const baseWeight = trustScore;
    
    // Add some randomness factor (±10%)
    const randomFactor = (Math.random() - 0.5) * 0.2;
    const finalWeight = baseWeight * (1 + randomFactor);
    
    return Math.max(1, Math.round(finalWeight));
  }

  weightedShuffle(members) {
    // Implementation of weighted random shuffle
    const shuffled = [...members];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Calculate probability of swap based on trust score difference
      const currentWeight = shuffled[i].weight;
      const targetWeight = shuffled[i - 1].weight;
      
      // Higher trust score members have lower chance of moving down
      const swapProbability = currentWeight / (currentWeight + targetWeight);
      
      if (Math.random() < swapProbability) {
        [shuffled[i], shuffled[i - 1]] = [shuffled[i - 1], shuffled[i]];
      }
    }
    
    return shuffled;
  }

  async addMemberToGroup(groupId, userId, inviteCode) {
    try {
      console.log('👥 Adding member to group:', { groupId, userId });

      const group = await groupRepository.findByGroupId(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.currentMembers >= group.maxMembers) {
        throw new Error('Group is full');
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

      // Check if group can be activated
      if (updateData.currentMembers >= group.requiredMembers && group.status === GROUP_STATUS.PENDING_ACTIVATION) {
        updateData.status = GROUP_STATUS.ACTIVE;
        updateData.activatedAt = new Date();
        updateData.nextPayoutDate = this.calculateNextPayoutDate(group.contributionFrequency);
        
        // Initialize payout order when group becomes active
        await this.initializePayoutOrder(groupId);
      }

      const updatedGroup = await groupRepository.update(groupId, updateData);

      console.log('✅ Member added successfully!');
      return {
        group: this.formatGroupResponse(updatedGroup),
        membershipCreated: true,
        payoutPosition: joinResult.payoutPosition
      };

    } catch (error) {
      throw new Error(`Failed to add member to group: ${error.message}`);
    }
  }

  async advanceToNextTurn(groupId) {
    try {
      console.log('⏭️ Advancing to next turn for group:', groupId);

      const group = await groupRepository.findByGroupId(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      if (group.status !== GROUP_STATUS.ACTIVE) {
        throw new Error('Group is not active');
      }

      // Get current payout recipient
      const currentRecipient = await membershipService.getMemberByPayoutPosition(
        groupId, 
        group.currentTurn
      );

      if (!currentRecipient) {
        throw new Error('No member found for current payout position');
      }

      // Process payout
      console.log('💰 Processing payout for current turn...');
      await this.processPayout(groupId, currentRecipient, group);

      // Advance turn
      let nextTurn = group.currentTurn + 1;
      let nextCycle = group.currentCycle;

      // Check if cycle is complete
      if (nextTurn > group.currentMembers) {
        nextTurn = 1;
        nextCycle = group.currentCycle + 1;
        
        // Start new cycle
        console.log('🔄 Starting new cycle...');
        await this.startNewCycle(groupId, nextCycle);
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

  async processPayout(groupId, recipient, group) {
    try {
      console.log('💸 Processing payout for:', recipient.userId);

      // Calculate payout amount (total contributions - fees)
      const account = await accountService.getAccountByGroupId(groupId);
      const payoutAmount = this.calculatePayoutAmount(account.currentBalance, group);

      // Create payout transaction
      const payoutData = {
        groupId,
        recipientUserId: recipient.userId,
        cycle: group.currentCycle,
        turn: group.currentTurn,
        amount: payoutAmount,
        scheduledDate: new Date(),
        description: `Cycle ${group.currentCycle}, Turn ${group.currentTurn} payout`
      };

      await payoutService.createPayout(payoutData);

      // Update member stats
      await membershipService.updateMemberStats(recipient.membershipId, {
        hasReceivedPayout: true,
        lastPayoutReceived: new Date(),
        totalPayouts: recipient.totalPayouts + payoutAmount
      });

      // Debit group account
      await accountService.debitAccount(
        groupId, 
        payoutAmount, 
        `Payout to ${recipient.userId}`
      );

      console.log('✅ Payout processed successfully!');

    } catch (error) {
      throw new Error(`Failed to process payout: ${error.message}`);
    }
  }

  async startNewCycle(groupId, cycleNumber) {
    try {
      console.log('🔄 Starting new cycle:', cycleNumber);

      // Re-randomize payout order based on updated trust scores
      await this.initializePayoutOrder(groupId);

      // Reset member payout flags
      const members = await membershipService.getGroupMemberships(groupId);
      
      for (const member of members) {
        await membershipService.updateMemberStats(member.membershipId, {
          hasReceivedPayout: false
        });
      }

      console.log('✅ New cycle started successfully!');

    } catch (error) {
      throw new Error(`Failed to start new cycle: ${error.message}`);
    }
  }

  calculatePayoutAmount(totalBalance, group) {
    // Simple calculation: divide by number of members
    const baseAmount = Math.floor(totalBalance / group.currentMembers);
    return Math.max(0, baseAmount);
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

  // Validation methods
  validateTreasurerData(treasurerData) {
    if (!treasurerData.phoneNumber) {
      throw new Error('Treasurer phone number is required');
    }

    if (!treasurerData.accountData) {
      throw new Error('Treasurer account data is required for virtual account creation');
    }

    if (!treasurerData.accountData.customerEmail) {
      throw new Error('Treasurer email is required for virtual account');
    }

    if (!treasurerData.accountData.bvn && !treasurerData.accountData.nin) {
      throw new Error('Treasurer BVN or NIN is required for virtual account');
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

  // Keep existing methods...
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

  validateUpdateData(updateData) {
    const allowedFields = ['description', 'contributionAmount'];
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
}

module.exports = new GroupService(); 