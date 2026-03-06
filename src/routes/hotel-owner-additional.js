const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// Helper to get owner ID from token
const getOwnerId = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id || decoded.sub || decoded.userId;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Get documents
router.get('/documents', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const documents = await prisma.document.findMany({
      where: { userId: ownerId },
      include: {
        hotel: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get gallery images
router.get('/gallery', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { hotelId } = req.query;
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, ownerId },
      select: { images: true }
    });

    const images = hotel?.images ? JSON.parse(hotel.images) : [];
    res.json({ success: true, data: { images } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get reports
router.get('/reports', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      select: { id: true }
    });
    const hotelIds = hotels.map(h => h.id);

    const totalBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds } }
    });

    const revenue = await prisma.booking.aggregate({
      where: { hotelId: { in: hotelIds }, paymentStatus: 'COMPLETED' },
      _sum: { totalAmount: true }
    });

    const totalRooms = await prisma.room.count({
      where: { hotelId: { in: hotelIds } }
    });

    res.json({
      success: true,
      data: {
        revenue: {
          total: revenue._sum.totalAmount || 0,
          monthly: 0,
          yearly: 0
        },
        bookings: {
          total: totalBookings,
          completed: 0
        },
        occupancy: totalRooms > 0 ? (totalBookings / totalRooms) * 100 : 0,
        totalRooms
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get settings
router.get('/settings', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const hotel = await prisma.hotel.findFirst({
      where: { ownerId },
      select: {
        checkInTime: true,
        checkOutTime: true
      }
    });

    res.json({
      success: true,
      data: {
        notifications: true,
        autoApprove: false,
        checkInTime: hotel?.checkInTime || '14:00',
        checkOutTime: hotel?.checkOutTime || '11:00'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update settings
router.put('/settings', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { checkInTime, checkOutTime } = req.body;
    
    await prisma.hotel.updateMany({
      where: { ownerId },
      data: { checkInTime, checkOutTime }
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
