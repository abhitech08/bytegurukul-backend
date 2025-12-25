require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const db = require('./models');
const passport = require('passport');

require('./config/passport');

// Import Routes (all unchanged)
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const lectureRoutes = require('./routes/lectureRoutes');
const pyqRoutes = require('./routes/pyqRoutes');
const studentRoutes = require('./routes/studentRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const commentRoutes = require('./routes/commentRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const progressRoutes = require('./routes/progressRoutes');
const taskRoutes = require('./routes/taskRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const projectRoutes = require('./routes/projectRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount Routes (unchanged)
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/internship', internshipRoutes);
app.use('/api/pyq', pyqRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);

// ───────────────────────────────────────────────────────────
// UPDATED STARTUP BLOCK — uses sequenced syncing
// ───────────────────────────────────────────────────────────
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection OK');

    // FIX: Instead of a blind sync({force: true}), we use the sequenced 
    // syncDatabase function defined in models/index.js to ensure 
    // "projects" exists before "Orders" tries to reference it.
    await db.syncDatabase(); 

    console.log('All tables and foreign key constraints established successfully!');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('CRITICAL STARTUP ERROR:', error);
    //process.exit(1);
  }
})();