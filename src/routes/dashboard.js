const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('../middleware/auth');

// Get dashboard stats
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owner's hotels
    const hotels = await prisma.hotel.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });

    if (hotels.length === 0) {
      return res.json({
        success: true,
        data: {
          totalBookings: 0,
          totalRevenue: 0,
          occupancyRate: 0,
          totalRooms: 0,
          activeBookings: 0,
          pendingBookings: 0,
          completedBookings: 0,
          totalReviews: 0,
          averageRating: 0,
          recentBookings: [],
          revenueTrend: []
        }
      });
    }

    const hotelIds = hotels.map(h => h.id);

    // Get total bookings
    const totalBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds } }
    });

    // Get bookings by status
    const activeBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds }, status: 'CONFIRMED' }
    });

    const pendingBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds }, status: 'PENDING' }
    });

    const completedBookings = await prisma.booking.count({
      where: { hotelId: { in: hotelIds }, status: 'COMPLETED' }
    });

    // Get total revenue
    const revenueData = await prisma.booking.aggregate({
      where: { 
        hotelId: { in: hotelIds },
        paymentStatus: 'COMPLETED'
      },
      _sum: { totalAmount: true }
    });
    const totalRevenue = revenueData._sum.totalAmount || 0;

    // Get total rooms
    const totalRooms = await prisma.room.count({
      where: { hotelId: { in: hotelIds } }
    });

    // Get total reviews and average rating
    const totalReviews = await prisma.review.count({
      where: { hotelId: { in: hotelIds } }
    });

    const ratingData = await prisma.review.aggregate({
      where: { hotelId: { in: hotelIds } },
      _avg: { rating: true }
    });
    const averageRating = ratingData._avg.rating || 0;

    // Calculate occupancy rate (simplified)
    const occupancyRate = totalRooms > 0 ? (activeBookings / totalRooms) * 100 : 0;

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: { hotelId: { in: hotelIds } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        hotel: { select: { name: true } },
        room: { select: { name: true, type: true } }
      }
    });

    // Get revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueTrend = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("totalAmount") as revenue,
        COUNT(*) as bookings
      FROM bookings
      WHERE "hotelId" IN (${hotelIds.join(',')})
        AND "paymentStatus" = 'COMPLETED'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    `;

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalRooms,
        activeBookings,
        pendingBookings,
        completedBookings,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        recentBookings,
        revenueTrend
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Get earnings summary
router.get('/earnings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const hotels = await prisma.hotel.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });

    if (hotels.length === 0) {
      return res.json({
        success: true,
        data: {
          totalEarnings: 0,
          pendingPayouts: 0,
          completedPayouts: 0,
          transactions: []
        }
      });
    }

    const hotelIds = hotels.map(h => h.id);

    // Get completed payments
    const completedPayments = await prisma.payment.aggregate({
      where: {
        booking: { hotelId: { in: hotelIds } },
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    });

    // Get pending payments
    const pendingPayments = await prisma.payment.aggregate({
      where: {
        booking: { hotelId: { in: hotelIds } },
        status: 'PENDING'
      },
      _sum: { amount: true }
    });

    const totalEarnings = completedPayments._sum.amount || 0;
    const pendingPayouts = pendingPayments._sum.amount || 0;

    // Get recent transactions
    const transactions = await prisma.payment.findMany({
      where: {
        booking: { hotelId: { in: hotelIds } }
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          include: {
            hotel: { select: { name: true } },
            user: { select: { name: true, email: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalEarnings,
        pendingPayouts,
        completedPayouts: totalEarnings,
        transactions
      }
    });
  } catch (error) {
    console.error('Earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings data',
      error: error.message
    });
  }
});

module.exports = router;
