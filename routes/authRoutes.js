const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport'); 
const { User } = require('../models');
const { protect } = require('../middleware/auth'); 

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log(`------------------------------------------------`);
  console.log(`[Login Attempt] Email: ${email}`);

  try {
    // 1. Check if user exists
    const user = await User.findOne({ 
        where: { email }
    });
    
    if (!user) {
      console.log('[Login Failed] User not found in database.');
      return res.status(400).json({ success: false, message: "User not found with this email" });
    }

    if (!user.password) {
        console.log('❌ [CRITICAL ERROR] Password field is NULL or undefined. Check your User Model scopes.');
        return res.status(500).json({ success: false, message: "Server Error: Password field missing." });
    }

    console.log(`[Login Found] User: ${user.username} (Role: ${user.role})`);
    
    // 2. Validate Password
    const isMatch = await user.validPassword(password);
    
    if (!isMatch) {
      console.log('❌ [Login Failed] Password hash did not match.');
      return res.status(400).json({ success: false, message: "Invalid credentials (password mismatch)" });
    }

    console.log('✅ [Login Success] Credentials matched.');

    // 3. Increment tokenVersion for session security
    await user.increment('tokenVersion');

    // 4. Create JWT Payload
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // Role is now consistently lowercase from DB
      tokenVersion: user.tokenVersion
    };

    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        return res.status(500).json({ success: false, message: "Server Configuration Error" });
    }

    // 4. Sign Token
    jwt.sign(
      payload,
      process.env.JWT_SECRET, 
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        console.log('[Login] Token generated successfully.');
        console.log(`------------------------------------------------`);
        res.json({
          success: true,
          token: token, 
          user: payload
        });
      }
    );

  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// @route   POST /api/auth/signup
// @desc    Register new user
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'student'
    });

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: payload
    });

  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user details
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user details
router.put('/update-profile', protect, async (req, res) => {
    try {
        const { name, phone } = req.body;
    const user = await User.findByPk(req.user.id);

        if (name) user.name = name;
        if (phone) user.phone = phone;
        
        await user.save();
        res.json({ success: true, message: "Profile updated", data: user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/auth/change-password
// @desc    Change Password
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

        const isMatch = await user.validPassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect current password" });

        // Hash the new password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        console.log(`[Password Change] User: ${user.email} changed password successfully`);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- SOCIAL LOGIN ROUTES ---

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    const user = req.user;
    // Increment tokenVersion for session security
    await user.increment('tokenVersion');
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth-success?token=${token}`);
  }
);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth-success?token=${token}`);
  }
);

module.exports = router;