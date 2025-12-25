const express = require('express');
const router = express.Router();
const { Lecture, Course } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/lectures/course/:courseId
// @desc    Get all lectures for a specific course
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const lectures = await Lecture.findAll({
            where: { courseId: req.params.courseId },
            order: [['order', 'ASC']]
        });
        res.json({ success: true, data: lectures });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/lectures
// @desc    Add a new lecture (Instructor/Admin only)
router.post('/', protect, async (req, res) => {
    try {
        const { title, videoUrl, description, courseId, order } = req.body;
        
        // Validation: Check if course exists
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Verify instructor owns the course
        if (course.instructorId !== req.user) {
            return res.status(403).json({ message: "You can only add lectures to your own courses" });
        }

        const newLecture = await Lecture.create({
            title, videoUrl, description, courseId, order
        });

        res.status(201).json({ success: true, data: newLecture });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/lectures/:lectureId
// @desc    Update a lecture (Instructor/Admin only)
router.put('/:lectureId', protect, async (req, res) => {
    try {
        const { title, videoUrl, description, order } = req.body;
        const lecture = await Lecture.findByPk(req.params.lectureId);
        
        if (!lecture) {
            return res.status(404).json({ message: "Lecture not found" });
        }

        // Verify instructor owns the course
        const course = await Course.findByPk(lecture.courseId);
        if (course.instructorId !== req.user) {
            return res.status(403).json({ message: "You can only edit your own lectures" });
        }

        // Update lecture fields
        if (title) lecture.title = title;
        if (videoUrl) lecture.videoUrl = videoUrl;
        if (description) lecture.description = description;
        if (order !== undefined) lecture.order = order;

        await lecture.save();

        res.json({ success: true, data: lecture, message: "Lecture updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/lectures/:lectureId
// @desc    Delete a lecture (Instructor/Admin only)
router.delete('/:lectureId', protect, async (req, res) => {
    try {
        const lecture = await Lecture.findByPk(req.params.lectureId);
        
        if (!lecture) {
            return res.status(404).json({ message: "Lecture not found" });
        }

        // Verify instructor owns the course
        const course = await Course.findByPk(lecture.courseId);
        if (course.instructorId !== req.user) {
            return res.status(403).json({ message: "You can only delete your own lectures" });
        }

        await lecture.destroy();

        res.json({ success: true, message: "Lecture deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;