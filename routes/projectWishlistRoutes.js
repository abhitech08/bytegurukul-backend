const express = require('express');
const router = express.Router();
const { ProjectWishlist, Project, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/project-wishlist/:projectId
// @desc    Add project to wishlist
router.post('/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    const existing = await ProjectWishlist.findOne({ where: { userId: req.user, projectId } });
    if (existing) return res.status(400).json({ success: false, message: "Already in wishlist" });

    await ProjectWishlist.create({ userId: req.user, projectId });
    res.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/project-wishlist/:projectId
// @desc    Remove project from wishlist
router.delete('/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await ProjectWishlist.destroy({ where: { userId: req.user, projectId } });

    if (result === 0) return res.status(404).json({ success: false, message: "Not in wishlist" });
    res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/project-wishlist
// @desc    Get user's project wishlist
router.get('/', protect, async (req, res) => {
  try {
    const wishlisted = await ProjectWishlist.findAll({
      where: { userId: req.user },
      include: [{ model: Project }],
      attributes: []
    });

    const projects = wishlisted.map(w => w.Project);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/project-wishlist/check/:projectId
// @desc    Check if project is in wishlist
router.get('/check/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    const exists = await ProjectWishlist.findOne({ where: { userId: req.user, projectId } });
    res.json({ success: true, isWishlisted: !!exists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
