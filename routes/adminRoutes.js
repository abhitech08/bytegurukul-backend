const express = require('express');
const router = express.Router();
const { User, Course, Enrollment, ActivityLog } = require('../models');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

function timeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} mins ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
}

// Apply admin authentication to all routes
router.use(protect);
router.use(adminAuth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/admin/user-growth
 * @desc    Get user registration growth data for charts
 */
router.get('/user-growth', async (req, res) => {
  try {
    const growthData = await User.findAll({
      attributes: [
        [User.sequelize.fn('DATE_TRUNC', 'month', User.sequelize.col('createdAt')), 'month'],
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: [User.sequelize.fn('DATE_TRUNC', 'month', User.sequelize.col('createdAt'))],
      order: [[User.sequelize.fn('DATE_TRUNC', 'month', User.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const formattedData = growthData.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count: parseInt(item.count)
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("User Growth Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses
 */
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.findAll({
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalCourses = await Course.count();
    const totalEnrollments = await Enrollment.count();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue: `$${totalEnrollments * 500}`
      }
    });
  } catch (error) {
    console.error("Admin Stats Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user manually
 */
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role.toLowerCase(),
      username: email.split('@')[0]
    });

    const userResponse = newUser.get({ plain: true });
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role.toLowerCase();

    await user.save();
    
    const userResponse = user.get({ plain: true });
    delete userResponse.password;

    res.json({ success: true, data: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/top-courses
router.get('/top-courses', async (req, res) => {
  try {
    const courses = await Course.findAll({
      attributes: [
        'id',
        'name',
        [
          Course.sequelize.literal('COUNT("Enrollments"."id")'),
          'enrollmentCount'
        ]
      ],
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['name'],
        },
        {
          model: Enrollment,
          attributes: [],
          required: false,
        },
      ],
      group: ['Course.id', 'Course.name', 'instructor.id'],
      order: [[Course.sequelize.literal('COUNT("Enrollments"."id")'), 'DESC']],
      limit: 5,
      subQuery: false,
    });

    const topCourses = courses.map(course => ({
      id: course.id,
      name: course.name,
      instructor: course.instructor?.name || 'Unknown',
      students: Number(course.getDataValue('enrollmentCount')) || 0,
      revenue: `₹${(course.getDataValue('enrollmentCount') || 0) * 500}`,
      rating: 4.8,
    }));

    res.json({ success: true, data: topCourses });
  } catch (error) {
    console.error('Top Courses Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/recent-activities
router.get('/recent-activities', async (req, res) => {
  try {
    const activities = await ActivityLog.findAll({
      attributes: ['message', 'priority', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const formattedActivities = activities.map(activity => ({
      message: activity.message,
      priority: activity.priority,
      time: timeAgo(new Date(activity.created_at))
    }));

    res.json({ success: true, data: formattedActivities });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;