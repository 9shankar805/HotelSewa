const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage, deleteImage, updateImage } = require('../lib/cloudinary');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Multer config for temporary storage
const upload = multer({ dest: 'uploads/temp/' });

// Upload single image
router.post('/single', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await uploadImage(req.file, req.body.folder || 'general');
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload multiple images
router.post('/multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file => uploadImage(file, req.body.folder || 'general'));
    const results = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile image (delete old, upload new)
router.put('/profile/:userId', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Extract publicId from old image URL if exists
    let oldPublicId = null;
    if (user.profileImage) {
      const urlParts = user.profileImage.split('/');
      const publicIdWithExt = urlParts.slice(-2).join('/');
      oldPublicId = publicIdWithExt.split('.')[0];
    }

    // Update image (delete old, upload new)
    const result = await updateImage(oldPublicId, req.file, 'users');

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: result.url }
    });

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update hotel images
router.put('/hotel/:hotelId', upload.array('images', 5), async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { replaceAll } = req.body; // If true, replace all images
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Get current hotel
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { images: true }
    });

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    let currentImages = [];
    try {
      currentImages = typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images || [];
    } catch (e) {
      currentImages = [];
    }

    // If replaceAll, delete old images
    if (replaceAll === 'true' && currentImages.length > 0) {
      for (const imageUrl of currentImages) {
        const urlParts = imageUrl.split('/');
        const publicIdWithExt = urlParts.slice(-2).join('/');
        const publicId = publicIdWithExt.split('.')[0];
        await deleteImage(publicId);
      }
      currentImages = [];
    }

    // Upload new images
    const uploadPromises = req.files.map(file => uploadImage(file, 'hotels'));
    const results = await Promise.all(uploadPromises);
    const newImageUrls = results.map(r => r.url);

    // Update database
    const updatedImages = [...currentImages, ...newImageUrls];
    await prisma.hotel.update({
      where: { id: hotelId },
      data: { images: JSON.stringify(updatedImages) }
    });

    res.json({
      success: true,
      message: 'Hotel images updated successfully',
      data: {
        uploadedImages: newImageUrls,
        totalImages: updatedImages.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete specific image
router.delete('/image', async (req, res) => {
  try {
    const { publicId, userId, hotelId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'publicId is required' });
    }

    // Delete from Cloudinary
    await deleteImage(publicId);

    // Update database if userId or hotelId provided
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { profileImage: null }
      });
    }

    if (hotelId) {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { images: true }
      });

      if (hotel) {
        let images = [];
        try {
          images = typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images || [];
        } catch (e) {
          images = [];
        }

        // Remove the deleted image URL
        const updatedImages = images.filter(url => !url.includes(publicId));
        
        await prisma.hotel.update({
          where: { id: hotelId },
          data: { images: JSON.stringify(updatedImages) }
        });
      }
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
