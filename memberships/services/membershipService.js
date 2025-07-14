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


      if (!membershipData.payoutPosition) {
        membershipData.payoutPosition = await membershipRepository.getNextPayoutPosition(
          membershipData.groupId
        );
      }

      const membership = {
        membershipId: uuidv4(),
        ...membershipData,
        joinedAt: new Date()
      };

      const createdMembership = await membershipRepository.create(membership);
      return this.formatMembershipResponse(createdMembership);

    } catch (error) {
      throw new Error(`Failed to create membership: ${error.message}`);
    }
  }

  async getMembershipByMembershipId(membershipId) {
    try {
      if (!membershipId) {
        throw new Error('Membership ID is required');
      }

      const membership = await membershipRepository.findByMembershipId(membershipId);
      
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
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const memberships = await membershipRepository.findByGroupId(groupId, includeInactive);
      return memberships.map(membership => this.formatMembershipResponse(membership));

    } catch (error) {
      throw error;
    }
  }

  async getUserMemberships(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const memberships = await membershipRepository.findByUserId(userId);
      return memberships.map(membership => this.formatMembershipResponse(membership));

    } catch (error) {
      throw error;
    }
  }

  async getMembershipByUserAndGroup(userId, groupId) {
    try {
      if (!userId || !groupId) {
        throw new Error('User ID and Group ID are required');
      }

      const membership = await membershipRepository.findByUserAndGroup(userId, groupId);
      
      if (!membership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(membership);

    } catch (error) {
      throw error;
    }
  }

  async updateMembership(membershipId, updateData) {
    try {
      this.validateMembershipUpdate(updateData);

      const updatedMembership = await membershipRepository.update(membershipId, updateData);
      
      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw error;
    }
  }

  async updatePayoutPosition(membershipId, newPosition) {
    try {
      if (!membershipId || !newPosition) {
        throw new Error('Membership ID and new position are required');
      }

      if (newPosition < 1) {
        throw new Error('Payout position must be at least 1');
      }

      const updatedMembership = await membershipRepository.update(membershipId, {
        payoutPosition: newPosition
      });

      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw error;
    }
  }

  async suspendMember(membershipId, reason, suspendedBy) {
    try {
      if (!membershipId || !reason) {
        throw new Error('Membership ID and suspension reason are required');
      }

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
      if (!membershipId) {
        throw new Error('Membership ID is required');
      }

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

  async updateMemberStats(membershipId, statsUpdate) {
    try {
      if (!membershipId) {
        throw new Error('Membership ID is required');
      }

      this.validateStatsUpdate(statsUpdate);

      const updatedMembership = await membershipRepository.update(membershipId, statsUpdate);

      if (!updatedMembership) {
        throw new Error('Membership not found');
      }

      return this.formatMembershipResponse(updatedMembership);

    } catch (error) {
      throw error;
    }
  }

  async calculateMemberTrustScore(membershipId) {
    try {
      const membership = await membershipRepository.findByMembershipId(membershipId);
      
      if (!membership) {
        throw new Error('Membership not found');
      }

      const totalPayments = membership.onTimePayments + membership.latePayments + membership.missedPayments;
      
      if (totalPayments === 0) {
        return 100; 
      }

     
      const onTimePercentage = membership.onTimePayments / totalPayments;
      const latePercentage = membership.latePayments / totalPayments;
      const missedPercentage = membership.missedPayments / totalPayments;

      
      const trustScore = (onTimePercentage * 100) + (latePercentage * 60) + (missedPercentage * 0);

      const finalScore = Math.max(0, Math.min(100, Math.round(trustScore)));

      await membershipRepository.update(membershipId, {
        memberTrustScore: finalScore
      });

      return finalScore;

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

    if (!groupId || groupId.trim().length === 0) {
      throw new Error('Group ID is required');
    }

    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (role && !Object.values(MEMBER_ROLE).includes(role)) {
      throw new Error('Invalid member role');
    }

    if (membershipData.payoutPosition && membershipData.payoutPosition < 1) {
      throw new Error('Payout position must be at least 1');
    }
  }

  validateMembershipUpdate(updateData) {
    const allowedFields = [
      'role', 'payoutPosition', 'isActive', 'suspendedAt', 'suspensionReason',
      'totalContributions', 'totalPayouts', 'missedPayments', 'latePayments',
      'onTimePayments', 'memberTrustScore', 'hasReceivedPayout', 'lastPayoutReceived', 'notes'
    ];

    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields for membership update: ${invalidFields.join(', ')}`);
    }

    if (updateData.role && !Object.values(MEMBER_ROLE).includes(updateData.role)) {
      throw new Error('Invalid member role');
    }

    if (updateData.payoutPosition && updateData.payoutPosition < 1) {
      throw new Error('Payout position must be at least 1');
    }

    if (updateData.memberTrustScore && (updateData.memberTrustScore < 0 || updateData.memberTrustScore > 100)) {
      throw new Error('Trust score must be between 0 and 100');
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