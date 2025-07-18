const groupService = require('../services/groupService');

class GroupController {
  async createGroup(req, res) {
    try {
      const {
        groupName,
        description,
        contributionAmount,
        contributionFrequency,
        requiredMembers,
        maxMembers,
        treasurerData
      } = req.body;

      const treasurerId = req.body.treasurerId || 'temp-treasurer-123';

      if (!treasurerData || !treasurerData.phoneNumber || !treasurerData.accountData) {
        return res.status(400).json({
          success: false,
          message: 'Treasurer data with phone number and account information is required'
        });
      }

      const groupData = {
        groupName,
        description,
        contributionAmount,
        contributionFrequency,
        requiredMembers,
        maxMembers
      };

      const result = await groupService.createGroup(groupData, treasurerId, treasurerData);

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: result
      });

    } catch (error) {
      console.error('Create group error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create group'
      });
    }
  }

  async activateGroup(req, res) {
    try {
      const { groupId } = req.params;
      const activatedBy = req.body.activatedBy || req.user?.userId || 'temp-user-123';
      
      const activatedGroup = await groupService.activateGroup(groupId, activatedBy);

      res.json({
        success: true,
        message: 'Group activated successfully',
        data: activatedGroup
      });

    } catch (error) {
      console.error('Activate group error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async addMemberToGroup(req, res) {
    try {
      const { groupId } = req.params;
      const { userId, inviteCode, phoneNumber } = req.body;

      if (!userId || !inviteCode) {
        return res.status(400).json({
          success: false,
          message: 'User ID and invite code are required'
        });
      }

      const result = await groupService.addMemberToGroup(groupId, userId, inviteCode, phoneNumber);

      const responseMessage = result.autoActivated 
        ? 'Member added and group auto-activated!'
        : 'Member added successfully';

      res.json({
        success: true,
        message: responseMessage,
        data: result
      });

    } catch (error) {
      console.error('Add member error:', error.message);
      
      // Simple, direct error handling
      let statusCode = 400;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('already')) statusCode = 409;
      if (error.message.includes('full') || error.message.includes('capacity')) statusCode = 422;
      
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async advanceToNextTurn(req, res) {
    try {
      const { groupId } = req.params;
      const updatedGroup = await groupService.advanceToNextTurn(groupId);

      res.json({
        success: true,
        message: 'Advanced to next turn successfully',
        data: updatedGroup
      });

    } catch (error) {
      console.error('Advance to next turn error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async initializePayoutOrder(req, res) {
    try {
      const { groupId } = req.params;
      const payoutOrder = await groupService.initializePayoutOrder(groupId);

      res.json({
        success: true,
        message: 'Payout order initialized successfully',
        data: payoutOrder
      });

    } catch (error) {
      console.error('Initialize payout order error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async getGroup(req, res) {
    try {
      const { groupId } = req.params;
      const group = await groupService.getGroupByGroupId(groupId);

      res.json({
        success: true,
        data: group
      });

    } catch (error) {
      console.error('Get group error:', error);
      
      const statusCode = error.message === 'Group not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllGroups(req, res) {
    try {
      const groups = await groupService.getAllGroups();

      res.json({
        success: true,
        data: groups,
        count: groups.length
      });

    } catch (error) {
      console.error('Get all groups error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTreasurerGroups(req, res) {
    try {
      const { treasurerId } = req.params;
      const groups = await groupService.getGroupsByTreasurer(treasurerId);

      res.json({
        success: true,
        data: groups,
        count: groups.length
      });

    } catch (error) {
      console.error('Get treasurer groups error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateGroup(req, res) {
    try {
      const { groupId } = req.params;
      const updateData = req.body;
      
      const updatedGroup = await groupService.updateGroup(groupId, updateData);

      res.json({
        success: true,
        message: 'Group updated successfully',
        data: updatedGroup
      });

    } catch (error) {
      console.error('Update group error:', error);
      
      const statusCode = error.message === 'Group not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async getGroupSummary(req, res) {
    try {
      const { groupId } = req.params;
      const group = await groupService.getGroupByGroupId(groupId);
      
      const summary = { group };

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Get group summary error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async pauseGroup(req, res) {
    try {
      const { groupId } = req.params;
      const { reason } = req.body;
      
      const updatedGroup = await groupService.updateGroup(groupId, {
        status: 'paused',
        pausedReason: reason,
        pausedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Group paused successfully',
        data: updatedGroup
      });

    } catch (error) {
      console.error('Pause group error:', error);
      
      const statusCode = error.message === 'Group not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async resumeGroup(req, res) {
    try {
      const { groupId } = req.params;
      
      const updatedGroup = await groupService.updateGroup(groupId, {
        status: 'active',
        pausedReason: null,
        pausedAt: null,
        resumedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Group resumed successfully',
        data: updatedGroup
      });

    } catch (error) {
      console.error('Resume group error:', error);
      
      const statusCode = error.message === 'Group not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async completeGroup(req, res) {
    try {
      const { groupId } = req.params;
      
      const updatedGroup = await groupService.updateGroup(groupId, {
        status: 'completed',
        completedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Group completed successfully',
        data: updatedGroup
      });

    } catch (error) {
      console.error('Complete group error:', error);
      
      const statusCode = error.message === 'Group not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new GroupController();