const express = require('express');
const router = express.Router();
const { Wishlist, Course, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/wishlist/:courseId
// @desc    Add course to wishlist
router.post('/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const existing = await Wishlist.findOne({ where: { userId: req.user, courseId } });
    if (existing) return res.status(400).json({ success: false, message: "Already in wishlist" });

    await Wishlist.create({ userId: req.user, courseId });
    res.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/wishlist/:courseId
// @desc    Remove course from wishlist
router.delete('/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const result = await Wishlist.destroy({ where: { userId: req.user, courseId } });
    
    if (result === 0) return res.status(404).json({ success: false, message: "Not in wishlist" });
    res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/wishlist
// @desc    Get user's wishlist
router.get('/', protect, async (req, res) => {
  try {
    const wishlisted = await Wishlist.findAll({
      where: { userId: req.user },
      include: [{ model: Course }],
      attributes: []
    });
    
    const courses = wishlisted.map(w => w.Course);
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/wishlist/check/:courseId
// @desc    Check if course is in wishlist
router.get('/check/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const exists = await Wishlist.findOne({ where: { userId: req.user, courseId } });
    res.json({ success: true, isWishlisted: !!exists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
