const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// Dashboard endpoints
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const ownerId = req.user.id;

    // Get owner's hotels
    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: { rooms: true }
    });

    if (!hotels.length) {
      return res.json({
        success: true,
        data: {
          totalBookings: 0,
          occupancyRate: 0,
          revenue: 0,
          activeRooms: 0,
          totalRooms: 0,
          bookingsChange: '0%',
          occupancyChange: '0%',
          revenueChange: '0%',
          roomsChange: '0%'
        }
      });
    }

    const hotelIds = hotels.map(h => h.id);
    const totalRooms = hotels.reduce((sum, h) => sum + h.rooms.length, 0);

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
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

    // Get bookings for the period
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        createdAt: { gte: startDate }
      }
    });

    const totalBookings = bookings.length;
    const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const occupiedRooms = bookings.filter(b => b.status === 'checked_in').length;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalBookings,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        revenue,
        activeRooms: occupiedRooms,
        totalRooms,
        bookingsChange: '+12%', // Mock change data
        occupancyChange: '+8%',
        revenueChange: '+15%',
        roomsChange: '0%'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: { 
        rooms: true,
        reviews: true
      }
    });

    const totalRooms = hotels.reduce((sum, h) => sum + h.rooms.length, 0);
    const availableRooms = hotels.reduce((sum, h) => 
      sum + h.rooms.filter(r => r.status === 'available').length, 0);
    const occupiedRooms = hotels.reduce((sum, h) => 
      sum + h.rooms.filter(r => r.status === 'occupied').length, 0);
    const maintenanceRooms = hotels.reduce((sum, h) => 
      sum + h.rooms.filter(r => r.status === 'maintenance').length, 0);

    const allReviews = hotels.flatMap(h => h.reviews);
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length 
      : 0;

    res.json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews: allReviews.length,
        responseRate: 95.0 // Mock response rate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/earnings', requireAuth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId }
    });

    const hotelIds = hotels.map(h => h.id);
    const now = new Date();

    // Generate earnings data based on period
    let earningsData = [];
    switch (period) {
      case 'today':
        for (let i = 0; i < 24; i++) {
          earningsData.push({
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), i).toISOString(),
            amount: Math.random() * 1000
          });
        }
        break;
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          earningsData.push({
            date: date.toISOString(),
            amount: 5000 + Math.random() * 10000
          });
        }
        break;
      case 'month':
        for (let i = 1; i <= 30; i++) {
          earningsData.push({
            date: new Date(now.getFullYear(), now.getMonth(), i).toISOString(),
            amount: 8000 + Math.random() * 15000
          });
        }
        break;
      case 'year':
        for (let i = 0; i < 12; i++) {
          earningsData.push({
            date: new Date(now.getFullYear(), i).toISOString(),
            amount: 50000 + Math.random() * 100000
          });
        }
        break;
    }

    res.json({
      success: true,
      data: earningsData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    // Mock notifications - in real app, fetch from database
    const notifications = [
      {
        id: 'notif_1',
        title: 'New Booking Received',
        message: 'John Doe booked Room 101 for 2 nights',
        type: 'booking',
        isRead: false,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: 'notif_2',
        title: 'Payment Received',
        message: 'Payment of ₹3,500 received for booking #1234',
        type: 'payment',
        isRead: false,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bookings endpoints
router.get('/bookings', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId }
    });

    const hotelIds = hotels.map(h => h.id);

    const whereClause = {
      hotelId: { in: hotelIds }
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        user: true,
        room: true,
        hotel: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      guestName: booking.user?.name || 'Guest',
      guestEmail: booking.user?.email || '',
      guestPhone: booking.user?.phone || '',
      roomNumber: booking.room?.roomNumber || '',
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
      amount: booking.totalAmount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      numberOfGuests: booking.guests,
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    res.json({
      success: true,
      data: formattedBookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bookings/recent', requireAuth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId }
    });

    const hotelIds = hotels.map(h => h.id);

    const bookings = await prisma.booking.findMany({
      where: { hotelId: { in: hotelIds } },
      include: {
        user: true,
        room: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      guestName: booking.user?.name || 'Guest',
      roomNumber: booking.room?.roomNumber || '',
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
      amount: booking.totalAmount,
      status: booking.status
    }));

    res.json({
      success: true,
      data: formattedBookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bookings/date-range', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId }
    });

    const hotelIds = hotels.map(h => h.id);

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId: { in: hotelIds },
        checkInDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        user: true,
        room: true
      }
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/bookings/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        room: true
      }
    });

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Rooms endpoints
router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId }
    });

    const hotelIds = hotels.map(h => h.id);

    const whereClause = {
      hotelId: { in: hotelIds }
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        hotel: true
      }
    });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/rooms/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const room = await prisma.room.update({
      where: { id },
      data: { status }
    });

    res.json({
      success: true,
      message: 'Room status updated successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/rooms', requireAuth, async (req, res) => {
  try {
    const roomData = req.body;
    const ownerId = req.user.id;

    // Verify hotel ownership
    const hotel = await prisma.hotel.findFirst({
      where: { 
        id: roomData.hotelId,
        ownerId 
      }
    });

    if (!hotel) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const room = await prisma.room.create({
      data: roomData
    });

    res.json({
      success: true,
      message: 'Room created successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const roomData = req.body;

    const room = await prisma.room.update({
      where: { id },
      data: roomData
    });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/rooms/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.room.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Earnings endpoints
router.get('/earnings/summary', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const totalEarnings = await prisma.booking.aggregate({
      where: {
        hotelId: { in: hotelIds },
        status: 'completed',
        paymentStatus: 'paid'
      },
      _sum: { totalAmount: true }
    });

    const thisMonth = await prisma.booking.aggregate({
      where: {
        hotelId: { in: hotelIds },
        status: 'completed',
        paymentStatus: 'paid',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      _sum: { totalAmount: true }
    });

    res.json({
      success: true,
      data: {
        totalEarnings: totalEarnings._sum.totalAmount || 0,
        thisMonth: thisMonth._sum.totalAmount || 0,
        pendingPayouts: 0, // Mock data
        nextPayout: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Profile endpoints
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Gallery endpoints
router.get('/gallery', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: {
        images: true,
        rooms: {
          include: { images: true }
        }
      }
    });

    const gallery = [];
    hotels.forEach(hotel => {
      hotel.images.forEach(img => {
        gallery.push({
          id: img.id,
          url: img.url,
          type: 'hotel',
          title: hotel.name,
          category: 'Hotel Images'
        });
      });
      
      hotel.rooms.forEach(room => {
        room.images.forEach(img => {
          gallery.push({
            id: img.id,
            url: img.url,
            type: 'room',
            title: `Room ${room.roomNumber}`,
            category: 'Room Images'
          });
        });
      });
    });

    res.json({ success: true, data: gallery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reviews endpoints
router.get('/reviews', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const reviews = await prisma.review.findMany({
      where: { hotelId: { in: hotelIds } },
      include: {
        user: {
          select: { name: true, profileImage: true }
        },
        hotel: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Analytics endpoints
router.get('/analytics/overview', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const totalBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds } }
    });

    const totalRevenue = await prisma.booking.aggregate({
      where: {
        hotelId: { in: hotelIds },
        paymentStatus: 'paid'
      },
      _sum: { totalAmount: true }
    });

    const averageRating = await prisma.review.aggregate({
      where: { hotelId: { in: hotelIds } },
      _avg: { rating: true }
    });

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        averageRating: averageRating._avg.rating || 0,
        totalHotels: hotels.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hotel creation endpoint
router.post('/hotels', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
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
      checkOutTime
    } = req.body;

    const hotel = await prisma.hotel.create({
      data: {
        ownerId,
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
        amenities: '[]',
        images: '[]',
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'Hotel created successfully',
      data: hotel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get owner's hotels
router.get('/hotels', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId },
      include: {
        rooms: true,
        _count: {
          select: {
            bookings: true,
            reviews: true
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update hotel
router.put('/hotels/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const updateData = req.body;

    // Verify ownership
    const hotel = await prisma.hotel.findFirst({
      where: { id, ownerId }
    });

    if (!hotel) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      data: updatedHotel
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
