
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
        treasurerData // New: Contains phone, email, and account data for virtual account
      } = req.body;

      // For now, using temporary treasurer ID (replace with actual auth)
      const treasurerId = req.body.treasurerId || 'temp-treasurer-123';

      // Validate treasurer data
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

      // Create group with virtual account, treasurer membership, and invite link
      const result = await groupService.createGroup(groupData, treasurerId, treasurerData);

      res.status(201).json({
        success: true,
        message: 'Group created successfully with virtual account and invite link',
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
        message: error.message || 'Failed to activate group'
      });
    }
  }

  async addMemberToGroup(req, res) {
  try {
    const { groupId } = req.params;
    
    // ✅ FIXED: Extract phoneNumber from request body
    const { userId, inviteCode, phoneNumber } = req.body;

    if (!userId || !inviteCode) {
      return res.status(400).json({
        success: false,
        message: 'User ID and invite code are required',
        required_fields: {
          userId: 'string',
          inviteCode: 'string',
          phoneNumber: 'string (optional but recommended)'
        }
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
    console.error('💥 Add member error:', error.message);
    
    const statusCode = this.getStatusCodeFromError(error.message);
    
    res.status(statusCode).json({
      success: false,
      message: error.message,
      error_code: this.getErrorCode(error.message)
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
        message: error.message || 'Failed to advance to next turn'
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
        message: error.message || 'Failed to initialize payout order'
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
        message: error.message || 'Failed to fetch group'
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
        message: error.message || 'Failed to fetch groups'
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
        message: error.message || 'Failed to update group'
      });
    }
  }

  async getGroupSummary(req, res) {
    try {
      const { groupId } = req.params;
      
      // Get group details
      const group = await groupService.getGroupByGroupId(groupId);
      
      // Get additional summary data (you can expand this)
      const summary = {
        group,
        // Add more summary data as needed:
        // members: await membershipService.getGroupMemberships(groupId),
        // account: await accountService.getAccountByGroupId(groupId),
        // recentPayments: await paymentService.getGroupPayments(groupId, null, null)
      };

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Get group summary error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch group summary'
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
        message: error.message || 'Failed to pause group'
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
        message: error.message || 'Failed to resume group'
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
        message: error.message || 'Failed to complete group'
      });
    }
  }
}

module.exports = new GroupController();