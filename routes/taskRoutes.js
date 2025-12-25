const express = require('express');
const router = express.Router();
const { Task, Submission, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Get all tasks (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { status, difficulty } = req.query;
        const where = {};
        
        if (status) where.status = status;
        if (difficulty) where.difficulty = difficulty;

        const tasks = await Task.findAll({
            where,
            include: [{ model: Submission, attributes: ['id', 'studentId', 'status'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/tasks/:taskId
// @desc    Get a single task with submissions
router.get('/:taskId', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.taskId, {
            include: [
                {
                    model: Submission,
                    attributes: ['id', 'studentId', 'status', 'submittedAt', 'grade'],
                    include: [{ model: User, attributes: ['id', 'name', 'email'] }]
                }
            ]
        });

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   POST /api/tasks
// @desc    Create a new task (Instructor/Admin only)
router.post('/', protect, async (req, res) => {
    try {
        const { title, description, difficulty, dueDate, maxGrade } = req.body;

        // Verify user is instructor or admin
        const user = await User.findByPk(req.user);
        if (user.role !== 'instructor' && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Only instructors can create tasks" });
        }

        const newTask = await Task.create({
            title,
            description,
            difficulty,
            dueDate,
            maxGrade,
            createdBy: req.user,
            status: 'active'
        });

        res.status(201).json({ success: true, data: newTask, message: "Task created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   PUT /api/tasks/:taskId
// @desc    Update a task (Instructor/Admin only)
router.put('/:taskId', protect, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.taskId);

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Verify user created this task
        if (task.createdBy !== req.user) {
            return res.status(403).json({ success: false, message: "You can only edit your own tasks" });
        }

        const { title, description, difficulty, dueDate, maxGrade, status } = req.body;

        if (title) task.title = title;
        if (description) task.description = description;
        if (difficulty) task.difficulty = difficulty;
        if (dueDate) task.dueDate = dueDate;
        if (maxGrade) task.maxGrade = maxGrade;
        if (status) task.status = status;

        await task.save();

        res.json({ success: true, data: task, message: "Task updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/tasks/:taskId
// @desc    Delete a task (Instructor/Admin only)
router.delete('/:taskId', protect, async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.taskId);

        if (!task) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        // Verify user created this task
        if (task.createdBy !== req.user) {
            return res.status(403).json({ success: false, message: "You can only delete your own tasks" });
        }

        await task.destroy();

        res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
