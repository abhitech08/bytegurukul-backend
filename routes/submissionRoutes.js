const express = require('express');
const router = express.Router();
const { Submission, Task, User, Application } = require('../models');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('node:path');

// Setup multer for file uploads
const upload = multer({
    dest: path.join(__dirname, '../uploads/submissions'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|txt|zip/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only PDF, DOC, DOCX, TXT, ZIP files are allowed'));
    }
});

// @route   GET /api/submissions/my-submissions
// @desc    Get current student's submissions
router.get('/my-submissions', protect, async (req, res) => {
    try {
        const submissions = await Submission.findAll({
            where: { studentId: req.user },
            include: [
                { model: Task, attributes: ['id', 'title', 'dueDate', 'maxGrade'] },
                { model: User, attributes: ['id', 'name', 'email'] }
            ],
            order: [['submittedAt', 'DESC']]
        });

        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/submissions/task/:taskId
// @desc    Get all submissions for a specific task
router.get('/task/:taskId', protect, async (req, res) => {
    try {
        const submissions = await Submission.findAll({
            where: { taskId: req.params.taskId },
            include: [
                { model: User, attributes: ['id', 'name', 'email'] },
                { model: Task, attributes: ['id', 'title', 'createdBy'] }
            ]
        });

        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/submissions/:submissionId
// @desc    Get a single submission details
router.get('/:submissionId', protect, async (req, res) => {
    try {
        const submission = await Submission.findByPk(req.params.submissionId, {
            include: [
                { model: Task, attributes: ['id', 'title', 'description', 'maxGrade', 'dueDate'] },
                { model: User, attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        res.json({ success: true, data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/submissions
// @desc    Submit a task (Student only)
router.post('/', protect, upload.single('file'), async (req, res) => {
    try {
        const { taskId, content } = req.body;

        // Validate task exists
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Check if already submitted
        const existingSubmission = await Submission.findOne({
            where: { taskId, studentId: req.user }
        });

        if (existingSubmission && existingSubmission.status === 'submitted') {
            return res.status(400).json({ success: false, message: "You have already submitted this task" });
        }

        // Create submission
        const submissionData = {
            taskId,
            studentId: req.user,
            content: content || '',
            fileUrl: req.file ? req.file.path : null,
            fileName: req.file ? req.file.originalname : null,
            status: 'submitted',
            submittedAt: new Date()
        };

        if (existingSubmission) {
            // Update existing draft submission
            Object.assign(existingSubmission, submissionData);
            await existingSubmission.save();
            return res.json({ success: true, data: existingSubmission, message: "Submission updated successfully" });
        }

        const newSubmission = await Submission.create(submissionData);

        res.status(201).json({ success: true, data: newSubmission, message: "Task submitted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/submissions/:submissionId
// @desc    Update submission grade and feedback (Instructor only)
router.put('/:submissionId', protect, async (req, res) => {
    try {
        const { grade, feedback, status } = req.body;
        const submission = await Submission.findByPk(req.params.submissionId, {
            include: [{ model: Task }]
        });

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        // Verify instructor owns the task
        if (submission.Task.createdBy !== req.user) {
            return res.status(403).json({ success: false, message: "You can only grade submissions for your own tasks" });
        }

        if (grade !== undefined) {
            if (grade < 0 || grade > submission.Task.maxGrade) {
                return res.status(400).json({ success: false, message: `Grade must be between 0 and ${submission.Task.maxGrade}` });
            }
            submission.grade = grade;
        }

        if (feedback) submission.feedback = feedback;
        if (status) submission.status = status;

        await submission.save();

        res.json({ success: true, data: submission, message: "Submission graded successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/submissions/:submissionId/verify
// @desc    Verify a submission (Admin only)
router.put('/:submissionId/verify', protect, adminAuth, async (req, res) => {
    try {
        const submission = await Submission.findByPk(req.params.submissionId);

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        // Update submission status to verified
        submission.status = 'verified';
        await submission.save();

        // Check if all submissions for the student are verified
        const allSubmissions = await Submission.findAll({
            where: { studentId: submission.studentId }
        });

        const allVerified = allSubmissions.every(sub => sub.status === 'verified');

        let applicationUpdated = false;
        if (allVerified) {
            // Find the user to get email
            const user = await User.findByPk(submission.studentId);
            if (user) {
                // Find application by email
                const application = await Application.findOne({
                    where: { email: user.email }
                });
                if (application) {
                    application.internshipStatus = 'completed';
                    await application.save();
                    applicationUpdated = true;
                }
            }
        }

        res.json({
            success: true,
            data: submission,
            message: "Submission verified successfully",
            allTasksCompleted: allVerified,
            applicationUpdated
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/submissions/:submissionId
// @desc    Delete a submission (Student or Instructor)
router.delete('/:submissionId', protect, async (req, res) => {
    try {
        const submission = await Submission.findByPk(req.params.submissionId, {
            include: [{ model: Task }]
        });

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        // Allow deletion by student who submitted or instructor who created task
        const isStudent = submission.studentId === req.user;
        const isInstructor = submission.Task.createdBy === req.user;

        if (!isStudent && !isInstructor) {
            return res.status(403).json({ success: false, message: "You don't have permission to delete this submission" });
        }

        await submission.destroy();

        res.json({ success: true, message: "Submission deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
