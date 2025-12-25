const express = require('express');
const router = express.Router();
const { Project, Order } = require('../models');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { upload } = require('../middleware/upload'); // Use the general upload middleware
const fs = require('fs');
const path = require('path');

// @route   GET /api/projects
// @desc    Get all projects (Public)
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/projects
// @desc    Create a new project with file upload (Admin Only)
router.post('/', protect, adminAuth, upload.single('sourceCode'), async (req, res) => {
  try {
    const { 
      title, 
      domain, 
      price, 
      description, 
      technologies, 
      features, 
      difficulty, 
      demoLink, 
      sourceCodeUrl 
    } = req.body;
    
    let finalSourceCodeUrl = sourceCodeUrl;
    
    // If file is uploaded, use the file path
    if (req.file) {
      finalSourceCodeUrl = `/uploads/${req.file.filename}`;
    }
    
    // Parse technologies and features from JSON string or create array
    let technologiesArray = [];
    if (technologies) {
      try {
        technologiesArray = JSON.parse(technologies);
      } catch {
        // If not valid JSON, assume it's comma-separated
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    let featuresArray = [];
    if (features) {
      try {
        featuresArray = JSON.parse(features);
      } catch {
        // If not valid JSON, assume it's comma-separated
        featuresArray = features.split(',').map(f => f.trim()).filter(f => f);
      }
    }
    
    const newProject = await Project.create({
      title,
      domain,
      price: price || 0,
      description,
      technologies: technologiesArray,
      features: featuresArray,
      difficulty: difficulty || 'Intermediate',
      rating: 4.5, // Default rating
      icon: '🚀', // Default icon
      demoLink,
      sourceCodeUrl: finalSourceCodeUrl,
      isPaid: price > 0
    });

    res.status(201).json({ 
      success: true, 
      message: 'Project uploaded successfully!',
      data: newProject 
    });
  } catch (error) {
    console.error('Project creation error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete file:', err);
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update a project (Admin Only)
router.put('/:id', protect, adminAuth, upload.single('sourceCode'), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    const { 
      title, 
      domain, 
      price, 
      description, 
      technologies, 
      features, 
      difficulty, 
      demoLink, 
      sourceCodeUrl 
    } = req.body;

    let finalSourceCodeUrl = project.sourceCodeUrl;
    
    // If a new file is uploaded, update the file path and delete old file
    if (req.file) {
      // Delete old file if it exists in uploads folder
      if (project.sourceCodeUrl && project.sourceCodeUrl.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', project.sourceCodeUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      finalSourceCodeUrl = `/uploads/${req.file.filename}`;
    } else if (sourceCodeUrl !== undefined) {
      // If sourceCodeUrl is provided in body (could be external URL)
      finalSourceCodeUrl = sourceCodeUrl;
    }
    
    // Parse technologies and features from JSON string or create array
    let technologiesArray = project.technologies;
    if (technologies) {
      try {
        technologiesArray = JSON.parse(technologies);
      } catch {
        // If not valid JSON, assume it's comma-separated
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t);
      }
    }
    
    let featuresArray = project.features;
    if (features) {
      try {
        featuresArray = JSON.parse(features);
      } catch {
        // If not valid JSON, assume it's comma-separated
        featuresArray = features.split(',').map(f => f.trim()).filter(f => f);
      }
    }
    
    // Update project
    await project.update({
      title: title || project.title,
      domain: domain || project.domain,
      price: price !== undefined ? price : project.price,
      description: description || project.description,
      technologies: technologiesArray,
      features: featuresArray,
      difficulty: difficulty || project.difficulty,
      demoLink: demoLink || project.demoLink,
      sourceCodeUrl: finalSourceCodeUrl,
      isPaid: (price !== undefined ? price : project.price) > 0
    });

    res.json({ 
      success: true, 
      message: 'Project updated successfully!',
      data: project 
    });
  } catch (error) {
    console.error('Project update error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete file:', err);
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete a project (Admin Only)
router.delete('/:id', protect, adminAuth, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }
    
    // Delete the associated file if it exists in uploads folder
    if (project.sourceCodeUrl && project.sourceCodeUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', project.sourceCodeUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await project.destroy();
    
    res.json({ 
      success: true, 
      message: "Project deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/projects/admin
// @desc    Get all projects for admin (with auth)
router.get('/admin', protect, adminAuth, async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/projects/:id/download
// @desc    Get download link (Protected - requires payment)
router.get('/:id/download', protect, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ 
      success: false, 
      message: "Project not found" 
    });

    // Check if the project has a downloadable file
    if (!project.sourceCodeUrl) {
      return res.status(404).json({ 
        success: false, 
        message: "No source code available for download" 
      });
    }

    // If sourceCodeUrl is an external URL (not a file), redirect to it
    if (project.sourceCodeUrl.startsWith('http')) {
      return res.json({ 
        success: true, 
        message: "Redirecting to external source code",
        url: project.sourceCodeUrl 
      });
    }

    // 1. Check if user bought this project (only for paid projects)
    if (project.price > 0) {
      const order = await Order.findOne({
        where: {
          userId: req.user,
          itemId: project.id,
          itemType: 'project',
          status: 'completed'
        }
      });

      // If no order found and user is not admin, deny access
      if (!order && !req.user.isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: "You must purchase this project first." 
        });
      }
    }

    // 2. Check if file exists locally
    if (project.sourceCodeUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', project.sourceCodeUrl);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          success: false, 
          message: "File not found on server" 
        });
      }

      // 3. Stream the file securely
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: "Error reading file" 
          });
        }
      });

      return; // Important to return here to prevent double response
    }

    // If we reach here, the sourceCodeUrl is not a local file
    res.status(404).json({ 
      success: false, 
      message: "Download not available for this project" 
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/projects/search
// @desc    Search projects by title, domain, or technologies
router.get('/search', async (req, res) => {
  try {
    const { q, domain, difficulty, minPrice, maxPrice } = req.query;
    
    const where = {};
    
    // Search by query string in title or technologies
    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { technologies: { [Op.like]: `%${q}%` } }
      ];
    }
    
    // Filter by domain
    if (domain) {
      where.domain = domain;
    }
    
    // Filter by difficulty
    if (difficulty) {
      where.difficulty = difficulty;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    
    const projects = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      count: projects.length,
      data: projects 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;