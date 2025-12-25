const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get user's notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/notifications/unread
// @desc    Get unread notifications count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user, isRead: false }
    });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
router.put('/:notificationId/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.notificationId);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    if (notification.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await notification.update({ isRead: true });
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user } }
    );
    res.json({ success: true, message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/notifications/:notificationId
// @desc    Delete a notification
router.delete('/:notificationId', protect, async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.notificationId);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    if (notification.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await notification.destroy();
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
