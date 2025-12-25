const express = require('express');
const router = express.Router();
const { Review, Course, User, Notification } = require('../models');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');

// @route   POST /api/reviews/:courseId
// @desc    Create a review for a course
router.post('/:courseId', protect, async (req, res) => {
  try {
    const { rating, title, content } = req.body;
    const { courseId } = req.params;

    if (!rating || !content) {
      return res.status(400).json({ success: false, message: "Rating and content are required" });
    }

    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const review = await Review.create({
      userId: req.user,
      courseId,
      rating,
      title,
      content
    });

    // Notify instructor
    const instructor = await User.findByPk(course.instructorId);
    if (instructor?.email) {
      await sendEmail(
        instructor.email,
        `New Review on Your Course: ${course.title}`,
        `A student left a ${rating}-star review on your course.\n\n"${content}"`
      );
    }

    res.json({ success: true, message: "Review created", data: review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/reviews/course/:courseId
// @desc    Get all reviews for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const reviews = await Review.findAll({
      where: { courseId },
      include: [{ model: User, attributes: ['id', 'username', 'profilePicture'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
router.put('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await review.update(req.body);
    res.json({ success: true, message: "Review updated", data: review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
router.delete('/:reviewId', protect, async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.userId !== req.user) return res.status(403).json({ success: false, message: "Unauthorized" });

    await review.destroy();
    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
