const express = require('express');
const router = express.Router();
const { Chat, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/chat/history
// @desc    Get chat history for the logged-in user
router.get('/history', protect, async (req, res) => {
  try {
    const chats = await Chat.findAll({
      where: { userId: req.user },
      order: [['createdAt', 'ASC']],
      include: [{ model: User, attributes: ['name'] }]
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/chat/send
// @desc    Send a new chat message
router.post('/send', protect, async (req, res) => {
  try {
    const { text, recipientId } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    // Get sender's role to determine sender type
    const sender = await User.findByPk(req.user);
    if (!sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const senderType = sender.role === 'admin' ? 'admin' : 'student';

    // If recipientId is provided, validate it exists
    if (recipientId) {
      const recipient = await User.findByPk(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
    }

    const newMessage = await Chat.create({
      sender: senderType,
      text: text.trim(),
      userId: req.user,
      recipientId: recipientId || null // Store recipient if specified
    });

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
