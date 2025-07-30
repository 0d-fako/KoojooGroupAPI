const userRepository = require('../repositories/userRepository');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class UserService {
  async registerUser({ name, email, phoneNumber, password }) {
    if (!name || !email || !phoneNumber || !password) {
      throw new Error('All fields are required');
    }
    const existing = await userRepository.findByEmailOrPhone(email, phoneNumber);
    if (existing) throw new Error('Email or phone already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      userId: uuidv4(),
      name,
      email,
      phoneNumber,
      passwordHash
    };
    return await userRepository.create(user);
  }

  async loginUser({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    return user;
  }

  async getUserDashboard(userId) {
    // Fetch groups, invites, memberships, etc.
    // You can expand this as needed
    return await userRepository.getDashboard(userId);
  }
}

module.exports = new UserService();