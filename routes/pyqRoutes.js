const express = require('express');
const router = express.Router();
const { uploadPDF } = require('../middleware/upload');
const { Pyq } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const fs = require('node:fs');
const path = require('node:path');

// Helper function to safely cleanup uploaded file
const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete file on error:', err.message);
    }
  }
};

// Helper function to validate PYQ data
const validatePyqData = (file, body) => {
  if (!file) {
    return { valid: false, message: 'No file uploaded. Please select a PDF file.', status: 400 };
  }

  const { subject, year, branch, semester } = body;
  if (!subject || !year || !branch || !semester) {
    return { valid: false, message: 'All fields (subject, year, branch, semester) are required', status: 400 };
  }

  const yearNum = Number.parseInt(year);
  if (Number.isNaN(yearNum) || yearNum < 2000 || yearNum > new Date().getFullYear()) {
    return { valid: false, message: 'Invalid year format', status: 400 };
  }

  const semesterNum = Number.parseInt(semester);
  if (Number.isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
    return { valid: false, message: 'Semester must be between 1 and 8', status: 400 };
  }

  const fileStats = fs.statSync(file.path);
  if (fileStats.size === 0) {
    return { valid: false, message: 'Uploaded file is empty', status: 400 };
  }

  return { valid: true, data: { subject: subject.trim(), yearNum, branch: branch.trim(), semesterNum, fileStats } };
};

// Helper function to handle Multer errors
const handleMulterError = (error) => {
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return { message: 'File size exceeds maximum allowed (20MB for PDFs)', status: 413 };
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return { message: 'Only one file can be uploaded at a time', status: 400 };
    }
  }
  if (error.message && (error.message.includes('File type') || error.message.includes('not allowed'))) {
    return { message: error.message, status: 400 };
  }
  return null;
};

// @route   POST /api/pyq
// @desc    Upload a new PYQ with strict validation
// @access  Admin/Instructor
router.post('/', uploadPDF.single('file'), async (req, res) => {
  try {
    // Validate input data using helper function
    const validation = validatePyqData(req.file, req.body);
    if (!validation.valid) {
      cleanupFile(req.file?.path);
      return res.status(validation.status).json({ 
        success: false,
        message: validation.message 
      });
    }

    const { subject, yearNum, branch, semesterNum, fileStats } = validation.data;

    // Create database entry
    const newPyq = await Pyq.create({
      subject,
      year: yearNum,
      branch,
      semester: semesterNum,
      filename: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: fileStats.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user || null
    });

    console.log("PYQ uploaded successfully:", newPyq.filename);

    res.status(201).json({ 
      success: true, 
      message: 'PYQ uploaded successfully!', 
      data: {
        id: newPyq.id,
        subject: newPyq.subject,
        year: newPyq.year,
        branch: newPyq.branch,
        semester: newPyq.semester,
        filePath: newPyq.filePath,
        fileSize: newPyq.fileSize,
        uploadedAt: newPyq.createdAt
      }
    });

  } catch (error) {
    cleanupFile(req.file?.path);
    console.error('Upload error:', error.message);
    
    // Handle Multer errors
    const multerError = handleMulterError(error);
    if (multerError) {
      return res.status(multerError.status).json({ 
        success: false,
        message: multerError.message 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server Error', 
      error: error.message 
    });
  }
});

// @route   GET /api/pyq
// @desc    Get all PYQs with search & filters
router.get('/', async (req, res) => {
    try {
        const { search, subject, year, branch, semester, limit = 50, page = 1 } = req.query;
        const where = {};

        // Validate year if provided
        if (year) {
          const yearNum = Number.parseInt(year);
          if (!Number.isNaN(yearNum)) {
            where.year = yearNum;
          }
        }

        // Validate semester if provided
        if (semester) {
          const semesterNum = Number.parseInt(semester);
          if (!Number.isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8) {
            where.semester = semesterNum;
          }
        }

        if (search) {
            where[Op.or] = [
                { subject: { [Op.iLike]: `%${search}%` } },
                { branch: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (subject) where.subject = subject.trim();
        if (branch) where.branch = branch.trim();

        const limitNum = Math.min(Number.parseInt(limit) || 50, 100);
        const pageNum = Math.max(Number.parseInt(page) || 1, 1);

        const { rows: pyqs, count: total } = await Pyq.findAndCountAll({
            where,
            attributes: ['id', 'subject', 'year', 'branch', 'semester', 'filePath', 'fileSize', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: limitNum,
            offset: (pageNum - 1) * limitNum
        });

        res.json({ 
          success: true, 
          data: pyqs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
          }
        });
    } catch (error) {
        console.error('PYQ fetch error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/pyq/:id
// @desc    Download a PYQ file
router.get('/:id', async (req, res) => {
    try {
        const pyq = await Pyq.findByPk(req.params.id);
        if (!pyq) {
          return res.status(404).json({ success: false, message: "PYQ not found" });
        }

        // Construct safe file path
        const filePath = path.join(__dirname, '../uploads', path.basename(pyq.filename));
        
        // Security: Prevent path traversal
        if (!filePath.startsWith(path.join(__dirname, '../uploads'))) {
          return res.status(400).json({ success: false, message: "Invalid file path" });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ success: false, message: "File not found on server" });
        }

        // Set proper headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${pyq.filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', fs.statSync(filePath).size);

        // Stream file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
          console.error('File stream error:', err.message);
          res.status(500).json({ success: false, message: 'Error downloading file' });
        });
    } catch (error) {
        console.error('Download error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   DELETE /api/pyq/:id
// @desc    Delete a PYQ
// @access  Admin/Instructor
router.delete('/:id', protect, async (req, res) => {
    try {
        const pyq = await Pyq.findByPk(req.params.id);
        if (!pyq) {
          return res.status(404).json({ success: false, message: "Paper not found" });
        }

        // Construct safe file path
        const filePath = path.join(__dirname, '../uploads', path.basename(pyq.filename));
        
        // Security: Prevent path traversal attacks
        if (!filePath.startsWith(path.join(__dirname, '../uploads'))) {
          return res.status(400).json({ success: false, message: "Invalid file path" });
        }

        // Delete file from disk if it exists
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log('File deleted:', pyq.filename);
          } catch (error_) {
            console.error('Failed to delete file:', error_.message);
            return res.status(500).json({ 
              success: false,
              message: 'Failed to delete file from server' 
            });
          }
        }

        // Delete database record
        await pyq.destroy();
        
        res.json({ 
          success: true, 
          message: "Paper deleted successfully" 
        });
    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;