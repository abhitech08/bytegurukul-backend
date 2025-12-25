
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];
      
      if (!process.env.JWT_SECRET) {
        console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
        return res.status(500).json({ message: 'Server Configuration Error' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // FIX: Get full user from database, not just the ID from token
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] } // Don't send password
      });
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // FIX: Attach full user object to request
      req.user = user; // This is now the full user object with id, name, email, etc.
      req.userRole = user.role;

      console.log(`✅ Authenticated user: ${user.email} (ID: ${user.id})`);
      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      // Frontend expects a 401 on error
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };