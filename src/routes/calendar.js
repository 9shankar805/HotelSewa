const express = require("express");
const { v4: uuid } = require("uuid");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Get calendar data for a specific month
router.get("/:hotelId", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { month, year } = req.query;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    // Get daily data for the month
    const dailyData = await prisma.calendarDailyData.findMany({
      where: {
        hotelId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get monthly statistics
    const monthlyStats = await prisma.calendarDailyData.aggregate({
      where: {
        hotelId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalBookings: true,
        totalRevenue: true,
      },
      _avg: {
        occupancyRate: true,
        totalRevenue: true,
      },
      _count: {
        totalRooms: true,
        occupiedRooms: true,
      },
    });

    // Format daily data
    const formattedDailyData = {};
    dailyData.forEach(day => {
      formattedDailyData[day.date.toISOString().split('T')[0]] = {
        date: day.date.toISOString().split('T')[0],
        totalRooms: day.totalRooms,
        availableRooms: day.availableRooms,
        occupiedRooms: day.occupiedRooms,
        blockedRooms: day.blockedRooms,
        totalBookings: day.totalBookings,
        totalRevenue: day.totalRevenue,
        occupancyRate: day.occupancyRate,
        isBlocked: day.isBlocked,
        blockReason: day.blockReason,
        bookings: [], // Will be populated separately if needed
        roomAvailability: [], // Will be populated separately if needed
      };
    });

    res.json({
      success: true,
      data: {
        hotelId,
        month: parseInt(month),
        year: parseInt(year),
        dailyData: formattedDailyData,
        monthlyStats: {
          totalBookings: monthlyStats._sum.totalBookings || 0,
          totalRevenue: monthlyStats._sum.totalRevenue || 0,
          averageOccupancy: monthlyStats._avg.occupancyRate || 0,
          averageDailyRate: monthlyStats._avg.totalRevenue || 0,
          totalAvailableRooms: monthlyStats._count.totalRooms || 0,
          totalOccupiedRooms: monthlyStats._count.occupiedRooms || 0,
          bookingsByDay: {},
          revenueByDay: {},
        },
      },
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar data",
    });
  }
});

// Get bookings for a specific date
router.get("/:hotelId/bookings", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { date } = req.query;

    const bookings = await prisma.calendarBooking.findMany({
      where: {
        hotelId,
        checkInDate: date,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: bookings.map(booking => ({
        id: booking.id,
        roomId: booking.roomId,
        roomNumber: booking.roomNumber,
        roomType: booking.roomType,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestCount: booking.guestCount,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalAmount: booking.totalAmount,
        status: booking.status,
        createdAt: booking.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

// Get room availability for a specific date
router.get("/:hotelId/availability", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { date } = req.query;

    const availability = await prisma.calendarRoomAvailability.findMany({
      where: {
        hotelId,
        date,
      },
      include: {
        room: true,
      },
      orderBy: {
        roomNumber: "asc",
      },
    });

    res.json({
      success: true,
      data: availability.map(avail => ({
        id: avail.id,
        roomId: avail.roomId,
        roomNumber: avail.roomNumber,
        roomType: avail.roomType,
        isAvailable: avail.isAvailable,
        price: avail.price,
        bookingId: avail.bookingId,
        guestName: avail.guestName,
      })),
    });
  } catch (error) {
    console.error("Error fetching room availability:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room availability",
    });
  }
});

// Update room availability
router.patch("/:hotelId/availability/:roomId", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId, roomId } = req.params;
    const { date, isAvailable } = req.body;

    // Check if room belongs to the hotel
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        hotelId,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Update or create availability record
    const availability = await prisma.calendarRoomAvailability.upsert({
      where: {
        roomId_date: {
          roomId,
          date,
        },
      },
      update: {
        isAvailable,
        updatedAt: new Date(),
      },
      create: {
        id: uuid(),
        hotelId,
        roomId,
        roomNumber: room.roomNumber,
        roomType: room.type,
        date,
        isAvailable,
        price: room.basePrice,
      },
    });

    // Update daily data
    await updateDailyData(hotelId, date);

    res.json({
      success: true,
      data: availability,
      message: "Room availability updated successfully",
    });
  } catch (error) {
    console.error("Error updating room availability:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update room availability",
    });
  }
});

// Block or unblock dates
router.post("/:hotelId/block", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { dates, isBlocked, reason } = req.body;

    // Update calendar daily data for each date
    for (const date of dates) {
      await prisma.calendarDailyData.upsert({
        where: {
          hotelId_date: {
            hotelId,
            date,
          },
        },
        update: {
          isBlocked,
          blockReason: isBlocked ? reason : null,
          updatedAt: new Date(),
        },
        create: {
          id: uuid(),
          hotelId,
          date,
          totalRooms: 0, // Will be updated by trigger
          availableRooms: 0,
          occupiedRooms: 0,
          blockedRooms: 0,
          totalBookings: 0,
          totalRevenue: 0,
          occupancyRate: 0,
          isBlocked,
          blockReason: isBlocked ? reason : null,
        },
      });
    }

    res.json({
      success: true,
      message: isBlocked ? "Dates blocked successfully" : "Dates unblocked successfully",
    });
  } catch (error) {
    console.error("Error blocking dates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update dates",
    });
  }
});

// Get calendar analytics
router.get("/:hotelId/analytics", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { month, year } = req.query;

    const analytics = await prisma.calendarAnalytics.findFirst({
      where: {
        hotelId,
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    if (!analytics) {
      // Create default analytics if not found
      const defaultAnalytics = await prisma.calendarAnalytics.create({
        data: {
          id: uuid(),
          hotelId,
          month: parseInt(month),
          year: parseInt(year),
          occupancyRate: 0,
          revenueGrowth: 0,
          newBookings: 0,
          cancelledBookings: 0,
          averageBookingValue: 0,
          totalGuests: 0,
          roomTypePerformance: {},
          topBookingDates: [],
        },
      });

      res.json({
        success: true,
        data: defaultAnalytics,
      });
    } else {
      res.json({
        success: true,
        data: analytics,
      });
    }
  } catch (error) {
    console.error("Error fetching calendar analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar analytics",
    });
  }
});

// Get pricing for date range
router.get("/:hotelId/pricing", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { startDate, endDate } = req.query;

    const pricing = await prisma.calendarPricing.findMany({
      where: {
        hotelId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    res.json({
      success: true,
      data: pricing.map(p => ({
        date: p.date,
        roomPrices: JSON.parse(p.roomPrices || '{}'),
        averagePrice: p.averagePrice,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
      })),
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pricing",
    });
  }
});

// Update pricing for a specific date
router.patch("/:hotelId/pricing", requireAuth, requireRole(["owner", "admin"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;
    const { date, roomPrices } = req.body;

    // Calculate pricing statistics
    const prices = Object.values(roomPrices);
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const pricing = await prisma.calendarPricing.upsert({
      where: {
        hotelId_date: {
          hotelId,
          date,
        },
      },
      update: {
        roomPrices: JSON.stringify(roomPrices),
        averagePrice,
        minPrice,
        maxPrice,
        updatedAt: new Date(),
      },
      create: {
        id: uuid(),
        hotelId,
        date,
        roomPrices: JSON.stringify(roomPrices),
        averagePrice,
        minPrice,
        maxPrice,
      },
    });

    res.json({
      success: true,
      data: pricing,
      message: "Pricing updated successfully",
    });
  } catch (error) {
    console.error("Error updating pricing:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pricing",
    });
  }
});

// Helper function to update daily data
async function updateDailyData(hotelId, date) {
  const { prisma } = require("../lib/prisma");

  try {
    // Get all rooms for the hotel
    const totalRooms = await prisma.room.count({
      where: { hotelId },
    });

    // Get bookings for the date
    const bookings = await prisma.calendarBooking.count({
      where: {
        hotelId,
        checkInDate: date,
        status: 'confirmed',
      },
    });

    // Get occupied rooms
    const occupiedRooms = await prisma.calendarRoomAvailability.count({
      where: {
        hotelId,
        date,
        isAvailable: false,
      },
    });

    // Get blocked rooms
    const blockedRooms = await prisma.calendarRoomAvailability.count({
      where: {
        hotelId,
        date,
        isAvailable: false,
        bookingId: { not: null },
      },
    });

    // Calculate available rooms
    const availableRooms = totalRooms - occupiedRooms;

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? occupiedRooms / totalRooms : 0;

    // Get total revenue (simplified - in real app this would sum actual booking revenues)
    const totalRevenue = 0; // Would be calculated from actual bookings

    await prisma.calendarDailyData.upsert({
      where: {
        hotelId_date: {
          hotelId,
          date,
        },
      },
      update: {
        totalRooms,
        availableRooms,
        occupiedRooms,
        blockedRooms,
        totalBookings: bookings,
        totalRevenue,
        occupancyRate,
        updatedAt: new Date(),
      },
      create: {
        id: uuid(),
        hotelId,
        date,
        totalRooms,
        availableRooms,
        occupiedRooms,
        blockedRooms,
        totalBookings: bookings,
        totalRevenue,
        occupancyRate,
        isBlocked: false,
      },
    });
  } catch (error) {
    console.error("Error updating daily data:", error);
  }
}

module.exports = router;
