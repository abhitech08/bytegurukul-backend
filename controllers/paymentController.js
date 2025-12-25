
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Order, Project, Course, User, Enrollment, Application, InstructorEarnings } = require('../models');

// Initialize Razorpay only if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized with key:', process.env.RAZORPAY_KEY_ID);
} else {
  console.warn('⚠️ Razorpay keys not found. Payment service will fail.');
}

// @desc    Create a new order (Razorpay)
// @route   POST /api/payments/create-order
exports.createOrder = async (req, res) => {
  try {
    console.log('🔧 createOrder called by user:', req.user?.email, 'ID:', req.user?.id);
    
    if (!razorpay) {
      return res.status(500).json({ message: 'Payment service not configured' });
    }

    if (!req.user || !req.user.id) {
      console.error('❌ No user found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { itemId, itemType } = req.body; // itemType: 'course', 'project', or 'internship_certificate'
    const userId = req.user.id;

    console.log(`🔧 Processing order: ${itemType} ID ${itemId} for user ${userId}`);

    // Verify user exists in database
    const { User } = require('../models');
    const dbUser = await User.findByPk(userId);
    if (!dbUser) {
      console.error(`❌ User with ID ${userId} not found in database`);
      return res.status(400).json({ message: 'User not found in database' });
    }
    console.log(`✅ User found in database: ${dbUser.email}`);

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
      // No item fetch needed, fixed amount for certificate
      amount = 900; // 9 INR in Paisa
    } else {
      return res.status(400).json({ message: 'Invalid itemType' });
    }
    const currency = 'INR';

    console.log(`💰 Amount calculated: ${amount} paisa (${amount/100} INR)`);

    const options = {
      amount: amount.toString(),
      currency,
      receipt: `receipt_${Date.now()}_${userId}`,
      payment_capture: 1 // Auto capture
    };

    // Create Order on Razorpay
    const order = await razorpay.orders.create(options);
    console.log(`✅ Razorpay order created: ${order.id}`);

    // Save to Database
    const newOrder = await Order.create({
      userId,
      courseId: itemType === 'course' ? itemId : null,
      projectId: itemType === 'project' ? itemId : null,
      applicationId: itemType === 'internship_certificate' ? itemId : null,
      orderId: order.id,
      amount: amount, // Amount in Paisa
      currency: 'INR',
      status: 'created',
      isMock: false,
      paymentDetails: JSON.stringify(order)
    });

    console.log(`✅ Database order created: ${newOrder.id}`);

    res.json({
      success: true,
      orderId: order.id,
      amount: amount,
      currency: currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      dbOrderId: newOrder.id
    });

  } catch (error) {
    console.error('❌ Razorpay Error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', req.body);
    console.error('❌ User:', req.user ? req.user.email : 'No user');
    res.status(500).json({
      message: 'Payment initiation failed',
      error: error.message,
      details: error.error ? error.error.description : 'Unknown error'
    });
  }
};

// @desc    Verify Payment Signature
// @route   POST /api/payments/verify
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
        console.log(`✅ Payment verified for order: ${order.id}`);
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
      console.error('❌ Invalid payment signature');
      res.status(400).json({ success: false, message: "Invalid Signature" });
    }

  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Handle Razorpay Webhook
// @route   POST /api/payments/webhook
exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    if (event === 'payment.captured') {
      // Payment was successful
      const razorpayOrderId = paymentEntity.order_id;

      // Find and update the order
      const order = await Order.findOne({ where: { orderId: razorpayOrderId } });
      if (order) {
        order.status = 'paid';
        order.paymentDetails = paymentEntity;
        await order.save();

        // Record Instructor Earnings for webhook payments
        if (order.courseId) {
          const course = await Course.findByPk(order.courseId);
          if (course && course.instructorId) {
            // Check if earnings already recorded
            const existingEarning = await InstructorEarnings.findOne({
              where: { orderId: order.id }
            });

            if (!existingEarning) {
              // Calculate platform fee (e.g., 20% platform fee)
              const platformFeePercent = 0.20;
              const platformFee = Math.round(order.amount * platformFeePercent);
              const netAmount = order.amount - platformFee;

              await InstructorEarnings.create({
                instructorId: course.instructorId,
                courseId: order.courseId,
                orderId: order.id,
                amount: order.amount,
                platformFee: platformFee,
                netAmount: netAmount,
                type: 'course_sale',
                status: 'earned'
              });
            }
          }
        }
      }
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('❌ Webhook Error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};