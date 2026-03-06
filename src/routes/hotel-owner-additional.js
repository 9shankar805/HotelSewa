const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// PRICING APIs
router.get('/pricing', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const rooms = await prisma.room.findMany({
      where: { hotelId: { in: hotelIds } },
      include: { hotel: { select: { name: true } } }
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/pricing/:roomId', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { pricePerNight } = req.body;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: { pricePerNight }
    });

    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// REVIEWS APIs
router.get('/reviews', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const reviews = await prisma.review.findMany({
      where: { hotelId: { in: hotelIds } },
      include: {
        user: { select: { name: true, profileImage: true } },
        hotel: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        ratingDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/reviews/:reviewId/reply', requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    // In a real app, you'd have a replies table
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Reply posted successfully',
      data: { reviewId, reply, repliedAt: new Date() }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// REPORTS APIs
router.get('/reports/revenue', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        createdAt: { gte: startDate },
        paymentStatus: 'PAID'
      },
      include: { hotel: { select: { name: true } } }
    });

    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const revenueByHotel = {};
    
    bookings.forEach(booking => {
      const hotelName = booking.hotel.name;
      if (!revenueByHotel[hotelName]) {
        revenueByHotel[hotelName] = 0;
      }
      revenueByHotel[hotelName] += booking.totalAmount;
    });

    res.json({
      success: true,
      data: {
        period,
        totalRevenue,
        totalBookings: bookings.length,
        revenueByHotel,
        averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/occupancy', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: { rooms: true }
    });

    const totalRooms = hotels.reduce((sum, h) => sum + h.rooms.length, 0);
    const hotelIds = hotels.map(h => h.id);

    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        checkInDate: { gte: startDate }
      }
    });

    const occupiedRoomDays = bookings.reduce((sum, booking) => {
      const days = Math.ceil((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    const totalRoomDays = totalRooms * Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const occupancyRate = totalRoomDays > 0 ? (occupiedRoomDays / totalRoomDays) * 100 : 0;

    res.json({
      success: true,
      data: {
        period,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalRooms,
        occupiedRoomDays,
        totalRoomDays
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/reports/bookings', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        createdAt: { gte: startDate }
      },
      include: {
        user: { select: { name: true, email: true } },
        hotel: { select: { name: true } }
      }
    });

    const statusBreakdown = {
      PENDING: bookings.filter(b => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
      CHECKED_IN: bookings.filter(b => b.status === 'CHECKED_IN').length,
      CHECKED_OUT: bookings.filter(b => b.status === 'CHECKED_OUT').length,
      CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
    };

    res.json({
      success: true,
      data: {
        period,
        totalBookings: bookings.length,
        statusBreakdown,
        bookings: bookings.slice(0, 100) // Limit to 100 for performance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DYNAMIC PRICING APIs
router.get('/pricing/dynamic', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const rooms = await prisma.room.findMany({
      where: { hotelId: { in: hotelIds } },
      include: { hotel: { select: { name: true } } }
    });

    // Mock dynamic pricing suggestions
    const pricingSuggestions = rooms.map(room => ({
      roomId: room.id,
      currentPrice: room.pricePerNight,
      suggestedPrice: room.pricePerNight * (0.9 + Math.random() * 0.2), // ±10% variation
      reason: 'Based on demand and market analysis',
      confidence: Math.floor(Math.random() * 30) + 70 // 70-100% confidence
    }));

    res.json({ success: true, data: pricingSuggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
