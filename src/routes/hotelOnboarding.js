const express = require('express');
const router = express.Router();
const { hotels, rooms, users } = require('../data/store');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/hotels'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Save hotel draft
router.post('/save-draft', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  validate({
    // All hotel data fields
    name: 'string',
    description: 'string',
    propertyType: 'string',
    category: 'string',
    address: 'string',
    city: 'string',
    state: 'string',
    pincode: 'string',
    phone: 'string',
    email: 'string',
    latitude: 'number',
    longitude: 'number',
    rooms: 'array',
    amenities: 'object',
    photos: 'object',
    pricing: 'object',
    policies: 'object'
  }),
  async (req, res) => {
    try {
      const hotelData = req.validated;
      const userId = req.user.sub;

      // Check if user already has a draft
      const existingDraft = await hotels.findFirst({
        where: {
          ownerId: userId,
          status: 'DRAFT'
        }
      });

      let hotel;
      if (existingDraft) {
        // Update existing draft
        hotel = await hotels.update({
          where: { id: existingDraft.id },
          data: {
            ...hotelData,
            status: 'DRAFT',
            updatedAt: new Date()
          }
        });
      } else {
        // Create new draft
        hotel = await hotels.create({
          data: {
            ...hotelData,
            ownerId: userId,
            status: 'DRAFT',
            rating: 0,
            totalReviews: 0,
            images: hotelData.photos ? Object.values(hotelData.photos).flat() : [],
            amenities: hotelData.amenities ? Object.values(hotelData.amenities).flat() : []
          }
        });
      }

      // Create/update rooms
      if (hotelData.rooms && hotelData.rooms.length > 0) {
        // Delete existing rooms for this hotel
        await rooms.deleteMany({
          where: { hotelId: hotel.id }
        });

        // Create new rooms
        for (const roomData of hotelData.rooms) {
          await rooms.create({
            data: {
              ...roomData,
              hotelId: hotel.id,
              pricePerNight: roomData.price,
              isActive: true
            }
          });
        }
      }

      res.json({
        success: true,
        data: hotel,
        message: 'Hotel draft saved successfully'
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({ error: 'Failed to save draft' });
    }
  }
);

// Submit hotel for approval
router.post('/submit', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  validate({
    // All hotel data fields with required validation
    name: 'string|required|min:3',
    description: 'string|required|min:50',
    propertyType: 'string|required',
    category: 'string|required',
    address: 'string|required',
    city: 'string|required',
    state: 'string|required',
    pincode: 'string|required|regex:^[1-9][0-9]{5}$',
    phone: 'string|required|regex:^[6-9]\d{9}$',
    email: 'string|required|email',
    latitude: 'number|required',
    longitude: 'number|required',
    totalRooms: 'number|required|min:1',
    rooms: 'array|required|min:1',
    amenities: 'object|required',
    photos: 'object|required',
    pricing: 'object|required',
    policies: 'object|required'
  }),
  async (req, res) => {
    try {
      const hotelData = req.validated;
      const userId = req.user.sub;

      // Validate required fields
      const validationErrors = validateRequiredFields(hotelData);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          details: validationErrors 
        });
      }

      // Create hotel with PENDING status
      const hotel = await hotels.create({
        data: {
          ...hotelData,
          ownerId: userId,
          status: 'PENDING',
          rating: 0,
          totalReviews: 0,
          images: Object.values(hotelData.photos).flat(),
          amenities: Object.values(hotelData.amenities).flat(),
          submittedAt: new Date()
        }
      });

      // Create rooms
      if (hotelData.rooms && hotelData.rooms.length > 0) {
        for (const roomData of hotelData.rooms) {
          await rooms.create({
            data: {
              ...roomData,
              hotelId: hotel.id,
              pricePerNight: roomData.price,
              isActive: true
            }
          });
        }
      }

      // Send notification to admin (in real app)
      await notifyAdminForApproval(hotel);

      res.json({
        success: true,
        data: hotel,
        message: 'Hotel submitted successfully! It will be reviewed within 24-48 hours.',
        reference: hotel.id
      });
    } catch (error) {
      console.error('Error submitting hotel:', error);
      res.status(500).json({ error: 'Failed to submit hotel' });
    }
  }
);

// Upload hotel photos
router.post('/upload-photos', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  upload.array('photos', 20), // Max 20 photos at once
  async (req, res) => {
    try {
      const { hotelId, category } = req.body;
      const userId = req.user.sub;

      // Verify hotel ownership
      const hotel = await hotels.findFirst({
        where: {
          id: hotelId,
          ownerId: userId
        }
      });

      if (!hotel) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const uploadedPhotos = req.files.map(file => ({
        url: `/uploads/hotels/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        category: category,
        uploadedAt: new Date()
      }));

      // Simulate AI analysis
      const analyzedPhotos = await Promise.all(
        uploadedPhotos.map(photo => analyzePhotoQuality(photo))
      );

      res.json({
        success: true,
        data: analyzedPhotos,
        message: `Successfully uploaded ${uploadedPhotos.length} photos`
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  }
);

// Get user's hotels
router.get('/my-hotels', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  async (req, res) => {
    try {
      const userId = req.user.sub;
      const { status } = req.query;

      const whereClause = { ownerId: userId };
      if (status) {
        whereClause.status = status.toUpperCase();
      }

      const hotels = await hotels.findMany({
        where: whereClause,
        include: {
          rooms: {
            include: {
              bookings: {
                where: {
                  checkIn: { gte: new Date() }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: hotels
      });
    } catch (error) {
      console.error('Error fetching hotels:', error);
      res.status(500).json({ error: 'Failed to fetch hotels' });
    }
  }
);

// Get hotel by ID
router.get('/:id', 
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.sub;

      const hotel = await hotels.findFirst({
        where: {
          id,
          ownerId: userId
        },
        include: {
          rooms: true,
          bookings: {
            where: {
              checkIn: { gte: new Date() }
            }
          }
        }
      });

      if (!hotel) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      res.json({
        success: true,
        data: hotel
      });
    } catch (error) {
      console.error('Error fetching hotel:', error);
      res.status(500).json({ error: 'Failed to fetch hotel' });
    }
  }
);

// Helper functions
function validateRequiredFields(hotelData) {
  const errors = [];

  // Basic info validation
  if (!hotelData.name || hotelData.name.length < 3) {
    errors.push('Hotel name (min 3 characters)');
  }
  if (!hotelData.description || hotelData.description.length < 50) {
    errors.push('Description (min 50 characters)');
  }
  if (!hotelData.propertyType) {
    errors.push('Property type');
  }
  if (!hotelData.category) {
    errors.push('Category');
  }

  // Location validation
  if (!hotelData.address || !hotelData.city || !hotelData.state) {
    errors.push('Complete address');
  }
  if (!hotelData.phone || !/^[6-9]\d{9}$/.test(hotelData.phone)) {
    errors.push('Valid phone number');
  }
  if (!hotelData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hotelData.email)) {
    errors.push('Valid email address');
  }

  // Room validation
  if (!hotelData.rooms || hotelData.rooms.length === 0) {
    errors.push('At least one room type');
  }
  
  if (hotelData.rooms) {
    hotelData.rooms.forEach((room, index) => {
      if (!room.name) errors.push(`Room ${index + 1} name`);
      if (!room.price || room.price < 100) errors.push(`Room ${index + 1} price`);
      if (!room.maxOccupancy || room.maxOccupancy < 1) errors.push(`Room ${index + 1} occupancy`);
    });
  }

  // Photos validation
  const totalPhotos = Object.values(hotelData.photos || {}).reduce((sum, arr) => sum + arr.length, 0);
  if (totalPhotos < 10) {
    errors.push('Minimum 10 photos required');
  }

  // Pricing validation
  if (!hotelData.pricing || !hotelData.pricing.basePrice || hotelData.pricing.basePrice < 100) {
    errors.push('Valid base pricing');
  }

  // Policies validation
  if (!hotelData.policies || !hotelData.policies.cancellationPolicy) {
    errors.push('Cancellation policy');
  }
  if (!hotelData.policies.paymentMethods || hotelData.policies.paymentMethods.length === 0) {
    errors.push('Payment methods');
  }

  return errors;
}

async function analyzePhotoQuality(photo) {
  // Simulate AI photo analysis
  const qualityScore = Math.floor(Math.random() * 40) + 60; // 60-100
  const issues = [];

  if (qualityScore < 70) issues.push('Low resolution');
  if (Math.random() < 0.1) issues.push('Poor lighting');
  if (Math.random() < 0.05) issues.push('Blurry image');

  return {
    ...photo,
    quality: qualityScore,
    status: qualityScore >= 75 ? 'approved' : 'needs_improvement',
    issues,
    analysis: {
      brightness: Math.floor(Math.random() * 40) + 60,
      sharpness: Math.floor(Math.random() * 30) + 70,
      composition: Math.floor(Math.random() * 20) + 80
    }
  };
}

async function notifyAdminForApproval(hotel) {
  // In real implementation, this would send email/notification to admin team
  console.log(`Hotel submitted for approval: ${hotel.name} (${hotel.id})`);
  return true;
}

module.exports = router;
