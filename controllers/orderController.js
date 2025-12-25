const { Order, User, Course, Project, Application } = require('../models');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay only if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// @desc    Create a new order (Razorpay)
// @route   POST /api/orders
// @access  Private (authenticated users)
exports.createOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ message: 'Payment service not configured' });
    }

    const { itemId, itemType } = req.body;
    const userId = req.user.id;

    // Validate itemType
    if (!['course', 'project', 'internship_certificate'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid itemType. Must be course, project, or internship_certificate' });
    }

    // Validate item exists and get amount
    let item;
    let amount;
    if (itemType === 'project') {
      item = await Project.findByPk(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Project not found' });
      }
      amount = item.price * 100; // Amount in Paisa (INR * 100)
    } else if (itemType === 'course') {
      item = await Course.findByPk(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Course not found' });
      }
      amount = item.price * 100; // Amount in Paisa (INR * 100)
    } else if (itemType === 'internship_certificate') {
      item = await Application.findByPk(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Application not found' });
      }
      amount = 900; // 9 INR in Paisa
    } else {
      return res.status(400).json({ message: 'Invalid itemType' });
    }

    const currency = 'INR';

    const options = {
      amount: amount.toString(),
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture
    };

    // Create Order on Razorpay
    const razorpayOrder = await razorpay.orders.create(options);

    // Save to Database
    const newOrder = await Order.create({
      userId,
      courseId: itemType === 'course' ? itemId : null,
      projectId: itemType === 'project' ? itemId : null,
      applicationId: itemType === 'internship_certificate' ? itemId : null,
      orderId: razorpayOrder.id,
      amount: amount, // Amount in Paisa
      currency: 'INR',
      status: 'created',
      isMock: false,
      paymentDetails: JSON.stringify(razorpayOrder)
    });

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amount,
      currency: currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      dbOrderId: newOrder.id
    });

  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
};

// @desc    Get all orders (admin only)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'username']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'price']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'price']
        },
        {
          model: Application,
          as: 'application',
          attributes: ['id', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (own orders or admin)
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'username', 'phone', 'address']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'price', 'description']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'price', 'description']
        },
        {
          model: Application,
          as: 'application',
          attributes: ['id', 'status', 'isCertificatePaid']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate status
    if (!['created', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be created, paid, or failed' });
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update status
    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

// @desc    Verify Payment Signature
// @route   POST /api/orders/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment Success!

      // 1. Update Order Status
      const order = await Order.findByPk(dbOrderId);
      if (order) {
        order.status = 'paid';
        order.paymentDetails = { razorpay_payment_id };
        await order.save();
      }

      // 2. Enroll User (Unlock Content)
      // Add logic here to add entry to "Enrollments" or "PurchasedProjects" table

      // Unlock certificate if itemType is 'internship_certificate'
      if (order.applicationId) {
        const application = await Application.findByPk(order.applicationId);
        if (application) {
          application.isCertificatePaid = true;
          await application.save();
        }
      }

      res.json({ success: true, message: "Payment Verified Successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid Signature" });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/user/:userId
// @access  Private/Admin or own orders
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if user is requesting their own orders or is admin
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'price']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'title', 'price']
        },
        {
          model: Application,
          as: 'application',
          attributes: ['id', 'status']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ message: 'Failed to fetch user orders', error: error.message });
  }
};
