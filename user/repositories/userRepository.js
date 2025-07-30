const User = require('../models/User');

class UserRepository {
  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async findByEmailOrPhone(email, phoneNumber) {
    return await User.findOne({ $or: [{ email }, { phoneNumber }] });
  }

  async getDashboard(userId) {
    // Example: fetch groups, invites, memberships for dashboard
    // You can expand this with aggregation or populate as needed
    return await User.findOne({ userId });
  }
}

module.exports = new UserRepository();