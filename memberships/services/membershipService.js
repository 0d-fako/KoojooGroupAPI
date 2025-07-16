// memberships/services/membershipService.js
const membershipRepository = require('../repositories/membershipRepository');
const { v4: uuidv4 } = require('uuid');
const { MEMBER_ROLE } = require('../../groups/enums/enums');

class MembershipService {
  async createMembership(membershipData) {
    try {
      this.validateMembershipData(membershipData);

      const existingMembership = await membershipRepository.findByUserAndGroup(
        membershipData.userId, 
        membershipData.groupId
      );

      if (existingMembership) {
        throw new Error('User is already a member of this group');
      }

      // Calculate trust score for new member
      const trustScore = this.calculateInitialTrustScore(membershipData);

      // Get next payout position
      const payoutPosition = await membershipRepository.getNextPayoutPosition(membershipData.groupId);

      const membership = {
        membershipId: uuidv4(),
        ...membershipData,
        payoutPosition,
        memberTrustScore: trustScore,
        joinedAt: new Date()
      };

      const createdMembership = await membershipRepository.create(membership);
      return this.formatMembershipResponse(createdMembership);

    } catch (error) {
      throw new Error(`Failed to create membership: ${error.message}`);
    }
  }

  calculateInitialTrustScore(membershipData) {
    let trustScore = 70; // Base score for everyone

    // Verification bonuses (same for all roles)
    if (membershipData.hasPhoneVerification) trustScore += 5;
    if (membershipData.hasEmailVerification) trustScore += 5;
    if (membershipData.hasBvnVerification) trustScore += 10;
    if (membershipData.hasNinVerification) trustScore += 10;

    // Cap at 100
    return Math.min(100, trustScore);
  }

  async updateTrustScore(membershipId, paymentBehavior) {
    try {
      const membership = await membershipRepository.findByMembershipId(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      const currentScore = membership.memberTrustScore;
      let newScore = currentScore;

      // Adjust based on payment behavior
      if (paymentBehavior === 'on_time') {
        newScore += 2; // Small reward for on-time payment
      } else if (paymentBehavior === 'late') {
        newScore -= 3; // Penalty for late payment
      } else if (paymentBehavior === 'missed') {
        newScore -= 5; // Larger penalty for missed payment
      }

      // Keep score between 0 and 100
      newScore = Math.max(0, Math.min(100, newScore));

      await membershipRepository.update(membershipId, {
        memberTrustScore: newScore
      });

      console.log(`Trust score updated: ${currentScore} → ${newScore} (${paymentBehavior})`);
      return newScore;

    } catch (error) {
      throw new Error(`Failed to update trust score: ${error.message}`);
    }
  }

  async updateMemberStats(membershipId, statsUpdate) {
    try {
      this.validateStatsUpdate(statsUpdate);

      const updatedMembership = await membershipRepository.update(membershipId, statsUpdate);
      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw new Error(`Failed to update member stats: ${error.message}`);
    }
  }

  async getMembershipByMembershipId(membershipId) {
    try {
      const membership = await membershipRepository.findByMembershipId(membershipId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(membership);

    } catch (error) {
      throw error;
    }
  }

  async getMembershipByUserAndGroup(userId, groupId) {
    try {
      const membership = await membershipRepository.findByUserAndGroup(userId, groupId);
      if (!membership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(membership);

    } catch (error) {
      throw error;
    }
  }

  async getGroupMemberships(groupId, includeInactive = false) {
    try {
      const memberships = await membershipRepository.findByGroupId(groupId, includeInactive);
      return memberships.map(membership => this.formatMembershipResponse(membership));

    } catch (error) {
      throw error;
    }
  }

  async getUserMemberships(userId) {
    try {
      const memberships = await membershipRepository.findByUserId(userId);
      return memberships.map(membership => this.formatMembershipResponse(membership));

    } catch (error) {
      throw error;
    }
  }

  async suspendMember(membershipId, reason, suspendedBy) {
    try {
      const updateData = {
        isActive: false,
        suspendedAt: new Date(),
        suspensionReason: reason
      };

      const updatedMembership = await membershipRepository.update(membershipId, updateData);
      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw error;
    }
  }

  async reactivateMember(membershipId) {
    try {
      const updateData = {
        isActive: true,
        suspendedAt: null,
        suspensionReason: null
      };

      const updatedMembership = await membershipRepository.update(membershipId, updateData);
      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw error;
    }
  }

  async getGroupMemberCount(groupId, activeOnly = true) {
    try {
      return await membershipRepository.countByGroup(groupId, activeOnly);
    } catch (error) {
      throw error;
    }
  }

  async getMemberByPayoutPosition(groupId, payoutPosition) {
    try {
      const membership = await membershipRepository.findByPayoutPosition(groupId, payoutPosition);
      if (!membership) {
        throw new Error(`No member found at payout position ${payoutPosition}`);
      }

      return this.formatMembershipResponse(membership);

    } catch (error) {
      throw error;
    }
  }

  // Validation methods
  validateMembershipData(membershipData) {
    const { groupId, userId, role } = membershipData;

    if (!groupId?.trim()) {
      throw new Error('Group ID is required');
    }

    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    if (role && !Object.values(MEMBER_ROLE).includes(role)) {
      throw new Error('Invalid member role');
    }

    if (membershipData.payoutPosition && membershipData.payoutPosition < 1) {
      throw new Error('Payout position must be at least 1');
    }
  }

  validateStatsUpdate(statsUpdate) {
    const allowedStatsFields = [
      'totalContributions', 'totalPayouts', 'missedPayments', 
      'latePayments', 'onTimePayments', 'hasReceivedPayout', 'lastPayoutReceived'
    ];

    const updateFields = Object.keys(statsUpdate);
    const invalidFields = updateFields.filter(field => !allowedStatsFields.includes(field));
    
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields for stats update: ${invalidFields.join(', ')}`);
    }

    // Validate numeric fields are non-negative
    const numericFields = ['totalContributions', 'totalPayouts', 'missedPayments', 'latePayments', 'onTimePayments'];
    numericFields.forEach(field => {
      if (statsUpdate[field] !== undefined && statsUpdate[field] < 0) {
        throw new Error(`${field} cannot be negative`);
      }
    });
  }

  formatMembershipResponse(membership) {
    return {
      membershipId: membership.membershipId,
      groupId: membership.groupId,
      userId: membership.userId,
      role: membership.role,
      payoutPosition: membership.payoutPosition,
      joinedAt: membership.joinedAt,
      isActive: membership.isActive,
      suspendedAt: membership.suspendedAt,
      suspensionReason: membership.suspensionReason,
      totalContributions: membership.totalContributions,
      totalPayouts: membership.totalPayouts,
      missedPayments: membership.missedPayments,
      latePayments: membership.latePayments,
      onTimePayments: membership.onTimePayments,
      memberTrustScore: membership.memberTrustScore,
      hasReceivedPayout: membership.hasReceivedPayout,
      lastPayoutReceived: membership.lastPayoutReceived,
      notes: membership.notes,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt
    };
  }
}

module.exports = new MembershipService();