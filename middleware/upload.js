const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Define allowed MIME types and extensions - UPDATED FOR ZIP FILES
const ALLOWED_MIMES = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip'  // ADD THIS LINE for Windows ZIP files
};

// File size limits (in bytes)
const FILE_LIMITS = {
    default: 50 * 1024 * 1024,  // 10MB default
    pdf: 50 * 1024 * 1024,      // 20MB for PDFs
    image: 10 * 1024 * 1024,     // 5MB for images
    video: 500 * 1024 * 1024,   // 500MB for videos
    document: 50 * 1024 * 1024, // 15MB for documents
    zip: 200 * 1024 * 1024       // 50MB for ZIP files
};

// Configure Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if it's a project upload
    if (req.baseUrl.includes('projects')) {
      const projectsDir = path.join(__dirname, '../uploads/projects');
      if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
      }
      cb(null, projectsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with sanitization
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext).replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, name + '_' + uniqueSuffix + ext); 
  }
});

// Strict File Validation
const fileFilter = (req, file, cb) => {
  // Get MIME type
  const mimeType = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Check if MIME type is allowed
  if (!ALLOWED_MIMES[mimeType]) {
    return cb(new Error(`File type '${mimeType}' is not allowed. Allowed types: ${Object.keys(ALLOWED_MIMES).join(', ')}`), false);
  }

  // 2. Verify file extension matches MIME type
  if (ALLOWED_MIMES[mimeType] !== ext) {
    return cb(new Error(`File extension '${ext}' does not match MIME type '${mimeType}'`), false);
  }

  // 3. Prevent double extensions (security)
  const filename = path.basename(file.originalname, ext);
  if (filename.includes('.')) {
    return cb(new Error('Double extensions are not allowed'), false);
  }

  // 4. Prevent suspicious filenames
  if (/[<>:"|?*]/.test(file.originalname)) {
    return cb(new Error('Filename contains invalid characters'), false);
  }

  // 5. Filename length validation
  if (file.originalname.length > 255) {
    return cb(new Error('Filename is too long (max 255 characters)'), false);
  }

  cb(null, true);
};

// Create upload middleware with strict validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_LIMITS.default,
    files: 1  // Single file upload
  }
});

// Create specialized upload instances for different file types
const uploadPDF = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    if (mimeType !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: FILE_LIMITS.pdf }
});

const uploadImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
      return cb(new Error('Only JPEG, PNG, and GIF images are allowed'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: FILE_LIMITS.image }
});

const uploadVideo = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    if (!['video/mp4', 'video/webm'].includes(mimeType)) {
      return cb(new Error('Only MP4 and WebM videos are allowed'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: FILE_LIMITS.video }
});

const uploadDocument = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    const allowedDocs = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
      'text/plain'
    ];
    if (!allowedDocs.includes(mimeType)) {
      return cb(new Error('Document type not allowed'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: FILE_LIMITS.document }
});

// ADD THIS: Specialized upload for ZIP files (for projects)
const uploadZIP = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const mimeType = file.mimetype.toLowerCase();
    const allowedZips = [
      'application/zip',
      'application/x-zip-compressed'  // Add Windows ZIP MIME type
    ];
    if (!allowedZips.includes(mimeType)) {
      return cb(new Error('Only ZIP files are allowed'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: FILE_LIMITS.zip }
});

module.exports = {
  upload,
  uploadPDF,
  uploadImage,
  uploadVideo,
  uploadDocument,
  uploadZIP  // Export the new ZIP upload middleware
};