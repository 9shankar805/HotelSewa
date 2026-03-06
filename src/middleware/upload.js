const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine subfolder based on upload type
    const uploadType = req.body.type || 'general';
    if (uploadType === 'hotel') {
      uploadPath += 'hotels/';
    } else if (uploadType === 'room') {
      uploadPath += 'rooms/';
    } else if (uploadType === 'user') {
      uploadPath += 'users/';
    } else if (uploadType === 'review') {
      uploadPath += 'reviews/';
    } else if (uploadType === 'hotels') {
      uploadPath += 'hotels/';
    } else {
      uploadPath += 'general/';
    }
    
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files at once
  }
});

// Single file upload middleware
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Helper function to get file URL
// Returns relative path that works with the API base URL
const getFileUrl = (filename, type = 'general') => {
  // Normalize the type to match the folder structure
  let folderType = type;
  if (type === 'hotel') folderType = 'hotels';
  else if (type === 'hotels') folderType = 'hotels';
  else if (type === 'room') folderType = 'rooms';
  else if (type === 'user') folderType = 'users';
  else if (type === 'review') folderType = 'reviews';
  else folderType = 'general';
  
  // Return relative path - Flutter app will prepend the API base URL
  return `/uploads/${folderType}/${filename}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  getFileUrl,
  deleteFile,
  ensureDir
};
