const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// @route   GET /api/user/profile
// @desc    Get current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user, {
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, email, bio, profilePicture, phone } = req.body;
    const user = await User.findByPk(req.user);
    
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update({
      username: username || user.username,
      email: email || user.email,
      bio: bio || user.bio,
      profilePicture: profilePicture || user.profilePicture,
      phone: phone || user.phone
    });

    res.json({ success: true, message: "Profile updated", data: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/user/change-password
// @desc    Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const isMatch = await user.validPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
