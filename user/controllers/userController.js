const userService = require('../services/userService');

class UserController {
  async register(req, res) {
    try {
      const user = await userService.registerUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async login(req, res) {
    try {
      const user = await userService.loginUser(req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(401).json({ success: false, message: error.message });
    }
  }

  async dashboard(req, res) {
    try {
      const userId = req.user.userId; // Assume auth middleware sets req.user
      const dashboard = await userService.getUserDashboard(userId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new UserController();