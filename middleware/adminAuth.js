// middleware/adminAuth.js
const adminAuth = async (req, res, next) => {
  try {
    // 1. Check if the user object exists (attached by 'protect' middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // 2. Simply check the role on the object already in memory
    // req.user is a Sequelize instance, so we can access .role directly
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    // 3. User is an admin, proceed
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { adminAuth };