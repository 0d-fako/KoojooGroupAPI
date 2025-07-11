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
        maxMembers
      } = req.body;

      const treasurerId = req.body.treasurerId || 'temp-treasurer-123';

      const groupData = {
        groupName,
        description,
        contributionAmount,
        contributionFrequency,
        requiredMembers,
        maxMembers
      };

      const group = await groupService.createGroup(groupData, treasurerId);

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: group
      });

    } catch (error) {
      console.error('Create group error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create group'
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
}

module.exports = new GroupController();