const express = require("express");

const { users, hotels } = require("../data/store");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const adminRouter = express.Router();

// Get all users
adminRouter.get("/users", async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      select: { 
        id: true, 
        role: true, 
        name: true, 
        email: true, 
        phone: true,
        verified: true, 
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            ownedHotels: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.json([]);
  }
});

// Get all hotels
adminRouter.get("/hotels", async (req, res) => {
  try {
    const list = await prisma.hotel.findMany({
      include: { 
        owner: { select: { name: true, email: true, phone: true } },
        _count: {
          select: {
            rooms: true,
            bookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.json([]);
  }
});

// Get pending hotels
adminRouter.get("/hotels/pending", async (req, res) => {
  try {
    const list = await prisma.hotel.findMany({
      where: { status: "PENDING" },
      include: { owner: { select: { name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.json([]);
  }
});

// Get all bookings
adminRouter.get("/bookings", async (req, res) => {
  try {
    const list = await prisma.booking.findMany({
      include: {
        user: { select: { name: true, email: true } },
        hotel: { select: { name: true, city: true } },
        room: { select: { name: true, roomNumber: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.json([]);
  }
});

// Get dashboard stats
adminRouter.get("/stats", async (req, res) => {
  try {
    const [totalUsers, totalHotels, totalBookings, pendingHotels, totalRooms] = await Promise.all([
      prisma.user.count(),
      prisma.hotel.count(),
      prisma.booking.count(),
      prisma.hotel.count({ where: { status: 'PENDING' } }),
      prisma.room.count()
    ]);

    const revenueData = await prisma.booking.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    });

    res.json({
      totalUsers,
      totalHotels,
      totalBookings,
      pendingHotels,
      totalRooms,
      totalRevenue: revenueData._sum.totalAmount || 0,
      activeUsers: await prisma.user.count({ where: { verified: true } }),
      approvedHotels: await prisma.hotel.count({ where: { status: 'APPROVED' } })
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.json({});
  }
});

adminRouter.post("/hotels/:id/approve", async (req, res) => {
  try {
    const hotel = await prisma.hotel.findUnique({ where: { id: req.params.id } });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const updated = await prisma.hotel.update({
      where: { id: hotel.id },
      data: { status: "APPROVED" },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error approving hotel:', error);
    res.status(500).json({ error: error.message });
  }
});

adminRouter.post("/hotels/:id/reject", async (req, res) => {
  try {
    const hotel = await prisma.hotel.findUnique({ where: { id: req.params.id } });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    const updated = await prisma.hotel.update({
      where: { id: hotel.id },
      data: { status: "REJECTED" },
    });
    res.json(updated);
  } catch (error) {
    console.error('Error rejecting hotel:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { adminRouter };
