const Group = require('../models/Group');

class GroupRepository {
  async create(groupData) {
    try {
      const group = new Group(groupData);
      return await group.save();
    } catch (error) {
      throw error;
    }
  }

  async findByGroupId(groupId) {
    try {
      return await Group.findOne({ groupId });
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      return await Group.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async findAll(){
    try {
      return await Group.find().sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    } 
  }

  async findByTreasurerId(treasurerId) {
    try {
      return await Group.find({ treasurerId }).sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }



  async update(groupId, updateData) {
    try {
      updateData.updatedAt = new Date();
      return await Group.findOneAndUpdate(
        { groupId }, 
        updateData, 
        { new: true, runValidators: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async delete(groupId) {
    try {
      return await Group.findOneAndDelete({ groupId });
    } catch (error) {
      throw error;
    }
  }

  async findByStatus(status, limit = 50, offset = 0) {
    try {
      return await Group.find({ status })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      throw error;
    }
  }

  async count(filters = {}) {
    try {
      return await Group.countDocuments(filters);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new GroupRepository()