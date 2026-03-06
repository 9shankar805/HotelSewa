const express = require('express');
const router = express.Router();
const { uploadSingle, uploadMultiple, getFileUrl, deleteFile } = require('../middleware/upload');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Serve uploaded files statically
router.use('/uploads', express.static('uploads'));

// Single image upload
router.post('/single', uploadSingle('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = getFileUrl(req.file.filename, req.body.type || 'general');
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Multiple images upload
router.post('/multiple', uploadMultiple('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.filename, req.body.type || 'general'),
      path: file.path
    }));

    res.json({
      success: true,
      message: `${req.files.length} files uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message
    });
  }
});

// Upload hotel images and update database
router.post('/hotel/:hotelId', uploadMultiple('images', 5), async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Get hotel current images
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, images: true }
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Process uploaded files
    const newImages = req.files.map(file => getFileUrl(file.filename, 'hotels'));
    const currentImages = Array.isArray(hotel.images) ? hotel.images : [];
    const updatedImages = [...currentImages, ...newImages];

    // Update hotel with new images
    await prisma.hotel.update({
      where: { id: hotelId },
      data: { images: updatedImages }
    });

    res.json({
      success: true,
      message: `${req.files.length} hotel images uploaded successfully`,
      data: {
        uploadedImages: newImages,
        totalImages: updatedImages.length
      }
    });
  } catch (error) {
    console.error('Hotel upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Hotel image upload failed',
      error: error.message
    });
  }
});

// Upload room images and update database
router.post('/room/:roomId', uploadMultiple('images', 5), async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Get room current info
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, hotelId: true }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Process uploaded files
    const newImages = req.files.map(file => getFileUrl(file.filename, 'rooms'));
    
    // Note: Room table doesn't have images field, so just return the URLs
    // In a real implementation, you might want to add an images field to Room model

    res.json({
      success: true,
      message: `${req.files.length} room images uploaded successfully`,
      data: {
        uploadedImages: newImages,
        roomId: room.id,
        note: 'URLs generated. Room table needs images field for database storage.'
      }
    });
  } catch (error) {
    console.error('Room upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Room image upload failed',
      error: error.message
    });
  }
});

// Upload user avatar
router.post('/avatar/:userId', uploadSingle('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const avatarUrl = getFileUrl(req.file.filename, 'users');

    // Note: User table doesn't have avatar field, so just return the URL
    // In a real implementation, you might want to add an avatar field to the User model
    
    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl: avatarUrl,
        note: 'URL generated. User table needs avatar field for database storage.'
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Avatar upload failed',
      error: error.message
    });
  }
});

// Delete image
router.delete('/image', async (req, res) => {
  try {
    const { imageUrl, type } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Extract filename from URL
    const filename = imageUrl.split('/').pop();
    const filePath = `uploads/${type || 'general'}/${filename}`;
    
    // Delete file from filesystem
    const deleted = deleteFile(filePath);
    
    if (deleted) {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Delete failed',
      error: error.message
    });
  }
});

module.exports = router;
