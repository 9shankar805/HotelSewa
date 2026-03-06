const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

// Get hotel status for owner
router.get('/hotel-status', async (req, res) => {
  try {
    // Get ownerId from JWT token
    const authHeader = req.headers.authorization;
    let ownerId;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ownerId = decoded.id || decoded.sub || decoded.userId;
      } catch (e) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }
    
    // Find owner's hotel
    const hotel = await prisma.hotel.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!hotel) {
      return res.json({
        success: true,
        hasHotel: false,
        data: null
      });
    }

    res.json({
      success: true,
      hasHotel: true,
      data: hotel
    });
  } catch (error) {
    console.error('Get hotel status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel status',
      error: error.message
    });
  }
});

// Get all hotels for the authenticated owner
router.get('/hotels', async (req, res) => {
  try {
    // Get ownerId from JWT token
    const authHeader = req.headers.authorization;
    let ownerId;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ownerId = decoded.id || decoded.sub || decoded.userId;
      } catch (e) {
        ownerId = req.user?.id || '2fe78aaa-75c9-4b3e-adc0-e6c5c20f2761';
      }
    } else {
      ownerId = req.user?.id || '2fe78aaa-75c9-4b3e-adc0-e6c5c20f2761';
    }
    
    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            pricePerNight: true,
            capacity: true,
            status: true
          }
        },
        _count: {
          select: {
            rooms: true,
            bookings: true
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
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels',
      error: error.message
    });
  }
});

router.get('/my-hotels', async (req, res) => {
  try {
    // TODO: Add authentication middleware to get owner ID from token
    const ownerId = req.user?.id || '2fe78aaa-75c9-4b3e-adc0-e6c5c20f2761'; // Mock owner ID
    
    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            pricePerNight: true,
            capacity: true,
            status: true
          }
        },
        _count: {
          select: {
            rooms: true,
            bookings: true
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
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels',
      error: error.message
    });
  }
});

// Get hotel details
router.get('/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        rooms: {
          include: {
            _count: {
              select: {
                bookings: true
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    console.error('Get hotel details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel details',
      error: error.message
    });
  }
});

// Create new hotel (No auth required for testing)
router.post('/hotels', async (req, res) => {
  try {
    console.log('Received hotel creation request:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      address,
      city,
      state,
      country,
      pincode,
      phone,
      email,
      checkInTime,
      checkOutTime,
      ownerId
    } = req.body;

    // Use ownerId from request or default
    const finalOwnerId = ownerId || req.user?.id || 'd84cd4cb-fd64-4cc2-8762-2ddb6060253e';

    const hotel = await prisma.hotel.create({
      data: {
        name,
        description,
        address,
        city,
        state,
        country: country || 'India',
        pincode,
        phone,
        email,
        checkInTime: checkInTime || '14:00',
        checkOutTime: checkOutTime || '11:00',
        ownerId: finalOwnerId,
        status: 'PENDING',
        images: '[]',
        amenities: '[]'
      }
    });

    console.log('Hotel created successfully:', hotel.id, 'Status:', hotel.status);

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully and pending approval',
      data: hotel
    });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create hotel',
      error: error.message
    });
  }
});

// Update hotel
router.put('/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = req.body;

    const hotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      data: hotel
    });
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel',
      error: error.message
    });
  }
});

// Update hotel status
router.patch('/:hotelId/status', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status } = req.body;

    const hotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: { status }
    });

    res.json({
      success: true,
      message: 'Hotel status updated successfully',
      data: hotel
    });
  } catch (error) {
    console.error('Update hotel status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel status',
      error: error.message
    });
  }
});

// Delete hotel
router.delete('/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;

    await prisma.hotel.delete({
      where: { id: hotelId }
    });

    res.json({
      success: true,
      message: 'Hotel deleted successfully'
    });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete hotel',
      error: error.message
    });
  }
});

// Get hotel analytics
router.get('/:hotelId/analytics', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { period = '30' } = req.query; // Default to 30 days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        createdAt: {
          gte: startDate
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const totalBookings = bookings.length;
    const occupiedRooms = bookings.filter(b => b.status === 'CONFIRMED').length;

    const analytics = {
      period: `${period} days`,
      totalRevenue,
      totalBookings,
      occupiedRooms,
      averageRevenue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      occupancyRate: 0, // TODO: Calculate based on total rooms
      recentBookings: bookings.slice(0, 10)
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get hotel analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

module.exports = router;
