const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Public hotel registration endpoint (no auth required)
router.post('/register', async (req, res) => {
  try {
    console.log('Hotel registration request received');
    
    // Get ownerId from JWT token (preferred) or request body (fallback)
    let ownerId;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Support 'id', 'sub', and 'userId' in JWT payload
        ownerId = decoded.id || decoded.sub || decoded.userId;
        console.log('Hotel registration - ownerId from token:', ownerId);
      } catch (e) {
        console.log('Could not verify token, trying body:', e.message);
        ownerId = req.body.ownerId;
      }
    } else {
      ownerId = req.body.ownerId;
    }
    
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'Owner ID is required. Please login first.'
      });
    }
    
    const {
      // Basic Info
      name,
      description,
      propertyType,
      totalRooms,
      yearOfEstablishment,
      priceRangeMin,
      priceRangeMax,
      // Location
      address,
      city,
      state,
      country,
      pincode,
      district,
      wardNumber,
      landmark,
      latitude,
      longitude,
      // Contact
      phone,
      email,
      checkInTime,
      checkOutTime,
      // Agreements
      termsAccepted,
      commissionAccepted,
      cancellationPolicyAccepted,
      // Photos - from Flutter app upload
      exteriorPhotoUrl,
      receptionPhotoUrl,
      galleryPhotos
    } = req.body;

    // Validate required fields
    if (!name || !address || !city || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, address, city, phone, email'
      });
    }

    // Validate agreements
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Terms and conditions must be accepted'
      });
    }

    if (!commissionAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Commission agreement must be accepted'
      });
    }

    const hotel = await prisma.hotel.create({
      data: {
        // Basic Info
        name,
        description: description || '',
        propertyType: propertyType || 'HOTEL',
        totalRooms: totalRooms ? parseInt(totalRooms) : null,
        yearOfEstablishment: yearOfEstablishment ? parseInt(yearOfEstablishment) : null,
        priceRangeMin: priceRangeMin ? parseInt(priceRangeMin) : null,
        priceRangeMax: priceRangeMax ? parseInt(priceRangeMax) : null,
        
        // Location
        address,
        city,
        state: state || '',
        country: country || 'India',
        pincode: pincode || '',
        district: district || '',
        wardNumber: wardNumber ? parseInt(wardNumber) : null,
        landmark: landmark || '',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        
        // Contact
        phone,
        email,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        
        // Agreements
        termsAccepted: termsAccepted || false,
        commissionAccepted: commissionAccepted || false,
        cancellationPolicyAccepted: cancellationPolicyAccepted || false,
        
        // Photos (URLs from upload)
        exteriorPhoto: exteriorPhotoUrl || null,
        receptionPhoto: receptionPhotoUrl || null,
        gallery: galleryPhotos ? (typeof galleryPhotos === 'string' ? JSON.parse(galleryPhotos) : galleryPhotos) : [],
        
        // Status and defaults
        status: 'PENDING',
        images: '[]',
        amenities: '[]',
        
        // Owner - using the verified ownerId from token
        ownerId: ownerId,
      }
    });

    console.log('✅ Hotel created:', hotel.id, 'Status:', hotel.status, 'OwnerId:', hotel.ownerId);

    res.status(201).json({
      success: true,
      message: 'Hotel registered successfully! Pending admin approval.',
      data: hotel
    });
  } catch (error) {
    console.error('❌ Hotel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register hotel',
      error: error.message
    });
  }
});

// Get hotel registration status (for testing - no auth required)
router.get('/status/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Find the user's hotel
    const hotel = await prisma.hotel.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'No hotel registration found'
      });
    }

    res.json({
      success: true,
      data: {
        id: hotel.id,
        name: hotel.name,
        status: hotel.status,
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check hotel status'
    });
  }
});

// Get hotel registration status (with auth - for production)
router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Support 'id', 'sub', and 'userId' in JWT payload
    const ownerId = decoded.id || decoded.sub || decoded.userId;
    
    console.log('Hotel status check - ownerId:', ownerId);

    // Find the user's hotel
    const hotel = await prisma.hotel.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'No hotel registration found'
      });
    }

    res.json({
      success: true,
      data: {
        id: hotel.id,
        name: hotel.name,
        status: hotel.status,
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check hotel status'
    });
  }
});

// Admin approve/reject hotel
router.put('/approve/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, reason } = req.body; // status: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be APPROVED or REJECTED'
      });
    }

    // Update hotel status
    const hotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Hotel ${hotelId} status updated to: ${status}`);

    res.json({
      success: true,
      message: `Hotel ${status.toLowerCase()} successfully`,
      data: {
        id: hotel.id,
        name: hotel.name,
        status: hotel.status,
        updatedAt: hotel.updatedAt
      }
    });

  } catch (error) {
    console.error('Hotel approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel status'
    });
  }
});

module.exports = router;
