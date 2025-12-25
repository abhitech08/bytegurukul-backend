const express = require('express');
const router = express.Router();
const { Comment, Lecture, User, Notification } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/comments/:lectureId
// @desc    Create a comment on a lecture
router.post('/:lectureId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const { lectureId } = req.params;

    if (!content) return res.status(400).json({ success: false, message: "Content is required" });

    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) return res.status(404).json({ success: false, message: "Lecture not found" });

    const comment = await Comment.create({
      userId: req.user,
      lectureId,
      content
    });

    res.json({ success: true, message: "Comment created", data: comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/comments/:lectureId
// @desc    Get all comments for a lecture
router.get('/:lectureId', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const comments = await Comment.findAll({
      where: { lectureId },
      include: [{ model: User, attributes: ['id', 'username', 'profilePicture'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
router.put('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
    if (comment.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await comment.update(req.body);
    res.json({ success: true, message: "Comment updated", data: comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });
    if (comment.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await comment.destroy();
    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/comments/:commentId/like
// @desc    Like a comment
router.post('/:commentId/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    await comment.increment('likes');
    res.json({ success: true, message: "Comment liked", data: comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
