const express = require('express');
const router = express.Router();
const { Application, Task, Submission, User, Internship } = require('../models');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');

// --- INTERNSHIP MANAGEMENT ROUTES ---

// @route   GET /api/internships
// @desc    Get all internships
router.get('/', async (req, res) => {
  try {
    const internships = await Internship.findAll({
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: internships });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/internships
// @desc    Create a new internship (Admin only)
router.post('/', protect, adminAuth, async (req, res) => {
  try {
    const { title, description, duration, startDate, endDate } = req.body;

    // Validation
    if (!title || !description || !duration || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

        const newInternship = await Internship.create({
      title,
      description,
      duration,
      startDate,
      endDate,
            createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: "Internship created successfully!", data: newInternship });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- All Internship Application logic below uses Application model and /api/internship/apply endpoints ---
// Removed InternshipApplication-based endpoints for clarity and consistency.

// @route   GET /api/internship/applications/:appId/can-generate-certificate
// @desc    Check if all tasks are complete and payment is done for certificate
router.get('/applications/:appId/can-generate-certificate', protect, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.appId);
        if (!application) return res.status(404).json({ success: false, message: "Application not found" });
        if (application.internshipStatus !== 'completed') return res.json({ success: false, message: "Internship not marked as completed by admin" });
        if (!application.isCertificatePaid) return res.json({ success: false, message: "Certificate payment not completed" });

        // Get all tasks for this role
        const tasks = await Task.findAll({ where: { role: application.roleId } });
        const submissions = await Submission.findAll({ where: { studentId: application.userId } });
        const submittedTaskIds = submissions.map(s => s.taskId);
        const allTasksDone = tasks.every(t => submittedTaskIds.includes(t.id));
        if (!allTasksDone) return res.json({ success: false, message: "All tasks not completed" });

        return res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/internship/applications/:appId/mark-completed
// @desc    Admin marks internship as completed
router.put('/applications/:appId/mark-completed', protect, adminAuth, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.appId);
        if (!application) return res.status(404).json({ success: false, message: "Application not found" });
        application.internshipStatus = 'completed';
        await application.save();
        res.json({ success: true, message: "Internship marked as completed", data: application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendEmail, internshipOfferEmail } = require('../utils/sendEmail');

// --- APPLICATION ROUTES (Existing) ---

// @route   POST /api/internships/apply/:category
// @desc    Submit internship application
router.post('/apply/:category', protect, async (req, res) => {
  try {
    const { name, email, phone, university, resumeText, roleId } = req.body;
    const { category } = req.params;
    
    // Validation
    if (!name || !email || !phone || !roleId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check if already applied
    const existing = await Application.findOne({
      where: { email, roleId }
    });

    if (existing && existing.status !== 'rejected') {
      return res.status(400).json({ success: false, message: "You have already applied for this role" });
    }

        const newApp = await Application.create({
            userId: req.user.id,
      name,
      email,
      phone,
      university,
      resumeText,
      roleId,
      status: 'pending',
      appliedAt: new Date()
    });

    res.status(201).json({ success: true, message: "Applied successfully!", data: newApp });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/internship/all
// @desc    Get all applications (public)
// Always return all applications for admin dashboard, protected by adminAuth
router.get('/all', protect, adminAuth, async (req, res) => {
    try {
        const apps = await Application.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['id', 'name', 'email'] }]
        });
        res.json({ success: true, data: apps });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/internship/my-applications
// @desc    Get logged-in student's applications
router.get('/my-applications', protect, async (req, res) => {
    try {
        const apps = await Application.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: apps });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/internship/applications/:appId/approve
// @desc    Approve application (Admin only)
router.put('/applications/:appId/approve', protect, adminAuth, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.appId);
        
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        application.status = 'approved';
        application.internshipStatus = 'ongoing';
        application.approvedAt = new Date();
        await application.save();

        // Generate professional PDF offer letter
        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Company letterhead
            doc.fontSize(20).text('ByteGurukul', { align: 'center' });
            doc.fontSize(12).text('Empowering Future Developers', { align: 'center' });
            doc.moveDown(2);

            // Date
            const currentDate = new Date().toLocaleDateString();
            doc.fontSize(12).text(`Date: ${currentDate}`, { align: 'right' });
            doc.moveDown(2);

            // Recipient details
            doc.fontSize(12).text(`${application.name}`);
            doc.text(`${application.email}`);
            doc.text(`${application.phone}`);
            if (application.university) doc.text(`${application.university}`);
            doc.moveDown(2);

            // Subject
            doc.fontSize(14).text('Subject: Internship Offer Letter', { underline: true });
            doc.moveDown(2);

            // Salutation
            doc.fontSize(12).text('Dear ' + application.name + ',');
            doc.moveDown(1);

            // Body
            doc.text('We are pleased to offer you the position of ' + application.roleId + ' Intern at ByteGurukul.');
            doc.moveDown(1);
            doc.text('This internship is designed to provide you with valuable hands-on experience in software development and related technologies.');
            doc.moveDown(1);

            // Terms
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7); // Assume start in 7 days
            doc.text('Internship Start Date: ' + startDate.toLocaleDateString());
            doc.text('Duration: 3 months (with possibility of extension based on performance)');
            doc.text('Compensation: Stipend of ₹5000 per month');
            doc.text('Location: Remote / Office (as applicable)');
            doc.moveDown(1);

            doc.text('As an intern, you will be expected to:');
            doc.text('• Complete assigned tasks and projects');
            doc.text('• Participate in team meetings and code reviews');
            doc.text('• Learn and apply new technologies as required');
            doc.text('• Maintain professional communication and work ethic');
            doc.moveDown(1);

            doc.text('Please confirm your acceptance of this offer by replying to this email within 7 days.');
            doc.moveDown(1);

            // Closing
            doc.text('We look forward to welcoming you to the ByteGurukul team!');
            doc.moveDown(2);
            doc.text('Best regards,');
            doc.text('ByteGurukul HR Team');
            doc.text('hr@bytegurukul.com');

            doc.end();
        });

        // Prepare email
        try {
            const { subject, message } = internshipOfferEmail(application.name, application.roleId);
            await sendEmail({
                email: application.email,
                subject,
                message,
                attachments: [{
                    filename: 'offer_letter.pdf',
                    content: pdfBuffer
                }]
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue with approval even if email fails
        }

        res.json({ success: true, message: "Application approved", data: application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/internship/applications/:appId/reject
// @desc    Reject application (Admin only)
router.put('/applications/:appId/reject', protect, adminAuth, async (req, res) => {
    try {
        const { reason } = req.body;
        const application = await Application.findByPk(req.params.appId);
        
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        application.status = 'rejected';
        application.rejectionReason = reason || null;
        application.rejectedAt = new Date();
        await application.save();

        res.json({ success: true, message: "Application rejected", data: application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- NEW TASK & SUBMISSION ROUTES ---

// @route   GET /api/internship/tasks
// @desc    Get tasks (Optional: Filter by user role)
router.get('/tasks', protect, async (req, res) => {
    try {
        // In future: Filter by req.user.role if needed
        const tasks = await Task.findAll();
        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/internship/tasks
// @desc    Create a new task (Admin Only)
router.post('/tasks', protect, async (req, res) => {
    try {
        const { title, description, roleId, deadline } = req.body;
        const task = await Task.create({ title, description, roleId, deadline, createdBy: req.user.id });
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/internship/task/submit
// @desc    Submit a task solution
router.post('/task/submit', protect, async (req, res) => {
    try {
        const { taskId, githubLink, liveLink } = req.body;

        // Check if already submitted
        const existing = await Submission.findOne({ 
            where: { studentId: req.user.id, taskId } 
        });
        
        if (existing) {
            return res.status(400).json({ message: "You have already submitted this task." });
        }

        const submission = await Submission.create({
            studentId: req.user.id,
            taskId,
            githubLink,
            liveLink
        });

        res.status(201).json({ success: true, message: "Task submitted successfully!", data: submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/internship/my-submissions
// @desc    Get logged in user's submissions
router.get('/my-submissions', protect, async (req, res) => {
    try {
        const subs = await Submission.findAll({
            where: { studentId: req.user.id },
            include: [{ model: Task }]
        });
        res.json({ success: true, data: subs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/internship/applications/:appId/mark-certificate-paid
// @desc    Mark certificate as paid for an application
router.put('/applications/:appId/mark-certificate-paid', protect, async (req, res) => {
    try {
        const application = await Application.findByPk(req.params.appId);
        if (!application) return res.status(404).json({ success: false, message: "Application not found" });
        if (application.userId !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized" });

        application.isCertificatePaid = true;
        await application.save();
        res.json({ success: true, message: "Certificate marked as paid", data: application });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
