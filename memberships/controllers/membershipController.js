const membershipService = require('../services/membershipService');

class MembershipController {
  async createMembership(req, res) {
    try {
      const membershipData = req.body;
      const membership = await membershipService.createMembership(membershipData);

      res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        data: membership
      });

    } catch (error) {
      console.error('Create membership error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create membership'
      });
    }
  }

  async getMembership(req, res) {
    try {
      const { membershipId } = req.params;
      const membership = await membershipService.getMembershipByMembershipId(membershipId);

      res.json({
        success: true,
        data: membership
      });

    } catch (error) {
      console.error('Get membership error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch membership'
      });
    }
  }

  async getGroupMemberships(req, res) {
    try {
      const { groupId } = req.params;
      const { includeInactive } = req.query;
      
      const memberships = await membershipService.getGroupMemberships(
        groupId, 
        includeInactive === 'true'
      );

      res.json({
        success: true,
        data: memberships,
        count: memberships.length
      });

    } catch (error) {
      console.error('Get group memberships error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch group memberships'
      });
    }
  }

  async getUserMemberships(req, res) {
    try {
      const { userId } = req.params;
      const memberships = await membershipService.getUserMemberships(userId);

      res.json({
        success: true,
        data: memberships,
        count: memberships.length
      });

    } catch (error) {
      console.error('Get user memberships error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user memberships'
      });
    }
  }

  async getUserGroupMembership(req, res) {
    try {
      const { userId, groupId } = req.params;
      const membership = await membershipService.getMembershipByUserAndGroup(userId, groupId);

      res.json({
        success: true,
        data: membership
      });

    } catch (error) {
      console.error('Get user group membership error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch membership'
      });
    }
  }

  async updateMembership(req, res) {
    try {
      const { membershipId } = req.params;
      const updateData = req.body;
      
      const membership = await membershipService.updateMembership(membershipId, updateData);

      res.json({
        success: true,
        message: 'Membership updated successfully',
        data: membership
      });

    } catch (error) {
      console.error('Update membership error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update membership'
      });
    }
  }

  async suspendMember(req, res) {
    try {
      const { membershipId } = req.params;
      const { reason } = req.body;
      const suspendedBy = req.user?.userId || 'system'; // Assuming user info from auth middleware
      
      const membership = await membershipService.suspendMember(membershipId, reason, suspendedBy);

      res.json({
        success: true,
        message: 'Member suspended successfully',
        data: membership
      });

    } catch (error) {
      console.error('Suspend member error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to suspend member'
      });
    }
  }

  async reactivateMember(req, res) {
    try {
      const { membershipId } = req.params;
      const membership = await membershipService.reactivateMember(membershipId);

      res.json({
        success: true,
        message: 'Member reactivated successfully',
        data: membership
      });

    } catch (error) {
      console.error('Reactivate member error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to reactivate member'
      });
    }
  }

  async updateMemberStats(req, res) {
    try {
      const { membershipId } = req.params;
      const statsUpdate = req.body;
      
      const membership = await membershipService.updateMemberStats(membershipId, statsUpdate);

      res.json({
        success: true,
        message: 'Member stats updated successfully',
        data: membership
      });

    } catch (error) {
      console.error('Update member stats error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update member stats'
      });
    }
  }

  async calculateTrustScore(req, res) {
    try {
      const { membershipId } = req.params;
      const trustScore = await membershipService.calculateMemberTrustScore(membershipId);

      res.json({
        success: true,
        message: 'Trust score calculated successfully',
        data: { membershipId, trustScore }
      });

    } catch (error) {
      console.error('Calculate trust score error:', error);
      
      const statusCode = error.message === 'Membership not found' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to calculate trust score'
      });
    }
  }

  async getMemberByPosition(req, res) {
    try {
      const { groupId, position } = req.params;
      const membership = await membershipService.getMemberByPayoutPosition(groupId, parseInt(position));

      res.json({
        success: true,
        data: membership
      });

    } catch (error) {
      console.error('Get member by position error:', error);
      
      const statusCode = error.message.includes('No member found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch member'
      });
    }
  }
}

module.exports = new MembershipController();