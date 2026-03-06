const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

// Get all rooms for a hotel
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;

    const where = { hotelId };
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();

    const rooms = await prisma.room.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.room.count({ where });

    res.json({
      success: true,
      data: rooms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: error.message
    });
  }
});

// Get room details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            bookings: true
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room details',
      error: error.message
    });
  }
});

// Create new room
router.post('/', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      type,
      pricePerNight,
      maxOccupancy,
      capacity,
      hotelId,
      amenities,
      description
    } = req.body;

    const room = await prisma.room.create({
      data: {
        name,
        type: type.toUpperCase(),
        pricePerNight: parseFloat(pricePerNight),
        maxOccupancy: parseInt(maxOccupancy),
        capacity: parseInt(capacity),
        hotelId,
        amenities: amenities || [],
        inventory: 1
      }
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: error.message
    });
  }
});

// Update room
router.put('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updateData = req.body;
    if (updateData.pricePerNight) {
      updateData.pricePerNight = parseFloat(updateData.pricePerNight);
    }
    if (updateData.maxOccupancy) {
      updateData.maxOccupancy = parseInt(updateData.maxOccupancy);
    }
    if (updateData.capacity) {
      updateData.capacity = parseInt(updateData.capacity);
    }
    if (updateData.type) {
      updateData.type = updateData.type.toUpperCase();
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room',
      error: error.message
    });
  }
});

// Update room status
router.patch('/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.body;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status: status.toUpperCase() }
    });

    res.json({
      success: true,
      message: 'Room status updated successfully',
      data: room
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room status',
      error: error.message
    });
  }
});

// Delete room
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    await prisma.room.delete({
      where: { id: roomId }
    });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room',
      error: error.message
    });
  }
});

// Get room types
router.get('/types/list', async (req, res) => {
  try {
    const roomTypes = ['STANDARD', 'DELUXE', 'PREMIUM', 'SUITE'];
    
    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room types',
      error: error.message
    });
  }
});

// Get room availability
router.get('/:roomId/availability', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        roomId,
        status: 'CONFIRMED',
        OR: [
          {
            checkIn: { lte: new Date(startDate) },
            checkOut: { gt: new Date(startDate) }
          },
          {
            checkIn: { lt: new Date(endDate) },
            checkOut: { gte: new Date(endDate) }
          }
        ]
      }
    });

    const availableDates = [];
    const bookedDates = bookings.map(b => ({
      checkIn: b.checkIn,
      checkOut: b.checkOut
    }));

    res.json({
      success: true,
      data: {
        roomId,
        availableDates,
        bookedDates,
        isAvailable: bookedDates.length === 0
      }
    });
  } catch (error) {
    console.error('Get room availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

module.exports = router;
