const inviteService = require('../services/inviteService');

class InviteController {
  async generateInvite(req, res) {
    try {
      const { groupId } = req.params;
      const inviteData = req.body;
      const createdBy = req.user?.userId || req.body.createdBy; // From auth middleware or body

      if (!createdBy) {
        return res.status(400).json({
          success: false,
          message: 'Creator ID is required'
        });
      }

      const invite = await inviteService.generateInviteLink(groupId, inviteData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Invite link generated successfully',
        data: invite
      });

    } catch (error) {
      console.error('Generate invite error:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate invite'
      });
    }
  }

  async validateInvite(req, res) {
    try {
      const { inviteCode } = req.params;
      const userData = req.body;

      if (!userData.userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const result = await inviteService.validateAndUseInvite(inviteCode, userData);

      res.json({
        success: true,
        message: 'Invite validated and membership created successfully',
        data: result
      });

    } catch (error) {
      console.error('Validate invite error:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to validate invite'
      });
    }
  }

  async getInvite(req, res) {
    try {
      const { inviteCode } = req.params;
      const invite = await inviteService.getInviteByCode(inviteCode);

      res.json({
        success: true,
        data: invite
      });

    } catch (error) {
      console.error('Get invite error:', error);

      const statusCode = error.message === 'Invite not found' ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch invite'
      });
    }
  }

  async getGroupInvites(req, res) {
    try {
      const { groupId } = req.params;
      const { createdBy } = req.query;

      const invites = await inviteService.getGroupInvites(groupId, createdBy);

      res.json({
        success: true,
        data: invites,
        count: invites.length
      });

    } catch (error) {
      console.error('Get group invites error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch group invites'
      });
    }
  }

  async getUserInvites(req, res) {
    try {
      const { userId } = req.params;
      const invites = await inviteService.getUserInvites(userId);

      res.json({
        success: true,
        data: invites,
        count: invites.length
      });

    } catch (error) {
      console.error('Get user invites error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch user invites'
      });
    }
  }

  async cancelInvite(req, res) {
    try {
      const { inviteId } = req.params;
      const cancelledBy = req.user?.userId || req.body.cancelledBy;

      if (!cancelledBy) {
        return res.status(400).json({
          success: false,
          message: 'Canceller ID is required'
        });
      }

      const invite = await inviteService.cancelInvite(inviteId, cancelledBy);

      res.json({
        success: true,
        message: 'Invite cancelled successfully',
        data: invite
      });

    } catch (error) {
      console.error('Cancel invite error:', error);

      const statusCode = error.message === 'Invite not found' ? 404 : 400;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel invite'
      });
    }
  }

  async getInviteStats(req, res) {
    try {
      const { groupId } = req.params;
      const stats = await inviteService.getInviteStats(groupId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get invite stats error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch invite stats'
      });
    }
  }

  async cleanupExpired(req, res) {
    try {
      const result = await inviteService.cleanupExpiredInvites();

      res.json({
        success: true,
        message: 'Expired invites cleaned up successfully',
        data: result
      });

    } catch (error) {
      console.error('Cleanup expired invites error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cleanup expired invites'
      });
    }
  }
}

module.exports = new InviteController()