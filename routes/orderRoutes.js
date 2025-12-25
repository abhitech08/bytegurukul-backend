const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getUserOrders,
  verifyPayment
} = require('../controllers/orderController');

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', protect, createOrder);

// @route   GET /api/orders
// @desc    Get all orders (admin only)
// @access  Private/Admin
router.get('/', protect, adminAuth, getAllOrders);

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private (own orders or admin)
router.get('/:id', protect, getOrderById);

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', protect, adminAuth, updateOrderStatus);

// @route   GET /api/orders/user/:userId
// @desc    Get orders for a specific user
// @access  Private (own orders or admin)
router.get('/user/:userId', protect, getUserOrders);

// @route   POST /api/orders/verify
// @desc    Verify payment signature
// @access  Private
router.post('/verify', protect, verifyPayment);

module.exports = router;
