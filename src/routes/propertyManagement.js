const express = require('express');
const router = express.Router();
const { hotels, rooms, bookings, users, franchises } = require('../data/store');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../lib/validate');

// Get property overview dashboard
router.get('/dashboard', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const userId = req.user.sub;
    
    // Get all hotels for this owner
    const ownerHotels = await hotels.findMany({
      where: { ownerId: userId },
      include: {
        rooms: true,
        bookings: {
          where: {
            checkIn: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30))
            }
          }
        }
      }
    });

    // Calculate metrics
    const totalRooms = ownerHotels.reduce((sum, hotel) => sum + hotel.rooms.length, 0);
    const totalRevenue = ownerHotels.reduce((sum, hotel) => 
      sum + hotel.bookings.reduce((bookingSum, booking) => 
        bookingSum + booking.totalAmount, 0), 0);
    const occupancyRate = totalRooms > 0 ? 
      (ownerHotels.reduce((sum, hotel) => 
        sum + hotel.bookings.filter(b => b.status === 'CHECKED_IN').length, 0) / totalRooms) * 100 : 0;
    
    const averageRating = ownerHotels.reduce((sum, hotel) => sum + hotel.rating, 0) / ownerHotels.length;

    // Recent bookings
    const recentBookings = await bookings.findMany({
      where: {
        hotel: { ownerId: userId },
        createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) }
      },
      include: {
        hotel: { select: { name: true } },
        user: { select: { name: true, email: true } },
        room: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Today's check-ins and check-outs
    const today = new Date().toDateString();
    const todayBookings = await bookings.findMany({
      where: {
        hotel: { ownerId: userId },
        OR: [
          { checkIn: new Date(today) },
          { checkOut: new Date(today) }
        ]
      },
      include: {
        hotel: { select: { name: true } },
        user: { select: { name: true } },
        room: { select: { name: true } }
      }
    });

    const checkIns = todayBookings.filter(b => 
      new Date(b.checkIn).toDateString() === today && b.status === 'CONFIRMED'
    );
    const checkOuts = todayBookings.filter(b => 
      new Date(b.checkOut).toDateString() === today && b.status === 'CHECKED_IN'
    );

    // Room status overview
    const roomStatus = await Promise.all(ownerHotels.map(async (hotel) => {
      const hotelRooms = await rooms.findMany({
        where: { hotelId: hotel.id },
        include: {
          bookings: {
            where: {
              OR: [
                { status: 'CHECKED_IN' },
                { status: 'CONFIRMED' }
              ]
            }
          }
        }
      });

      return {
        hotelId: hotel.id,
        hotelName: hotel.name,
        totalRooms: hotelRooms.length,
        available: hotelRooms.filter(room => 
          room.bookings.length === 0 && room.isActive
        ).length,
        occupied: hotelRooms.filter(room => 
          room.bookings.some(b => b.status === 'CHECKED_IN')
        ).length,
        reserved: hotelRooms.filter(room => 
          room.bookings.some(b => b.status === 'CONFIRMED' && !room.bookings.some(cb => cb.status === 'CHECKED_IN'))
        ).length,
        maintenance: hotelRooms.filter(room => !room.isActive).length
      };
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalHotels: ownerHotels.length,
          totalRooms,
          totalRevenue,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          averageRating: Math.round(averageRating * 10) / 10
        },
        todaySummary: {
          checkIns: checkIns.length,
          checkOuts: checkOuts.length,
          arrivals: checkIns,
          departures: checkOuts
        },
        recentBookings,
        roomStatus
      }
    });
  } catch (error) {
    console.error('Error fetching property dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get housekeeping management
router.get('/housekeeping', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { hotelId, date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    // Get hotel rooms with current bookings
    const hotelRooms = await rooms.findMany({
      where: { 
        hotelId: hotelId || undefined,
        hotel: { ownerId: req.user.sub }
      },
      include: {
        bookings: {
          where: {
            OR: [
              { status: 'CHECKED_IN' },
              { status: 'CHECKED_OUT' },
              { 
                status: 'CONFIRMED',
                checkIn: { lte: targetDate },
                checkOut: { gt: targetDate }
              }
            ]
          },
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    const housekeepingStatus = hotelRooms.map(room => {
      const currentBooking = room.bookings.find(b => b.status === 'CHECKED_IN');
      const checkoutToday = room.bookings.some(b => 
        new Date(b.checkOut).toDateString() === targetDate.toDateString() && 
        b.status === 'CHECKED_IN'
      );
      const checkinToday = room.bookings.some(b => 
        new Date(b.checkIn).toDateString() === targetDate.toDateString() && 
        b.status === 'CONFIRMED'
      );

      let status = 'AVAILABLE';
      let priority = 'LOW';
      let notes = '';

      if (currentBooking) {
        status = 'OCCUPIED';
        priority = 'MEDIUM';
      } else if (checkoutToday) {
        status = 'NEEDS_CLEANING';
        priority = 'HIGH';
        notes = 'Guest checking out today';
      } else if (checkinToday) {
        status = 'NEEDS_PREPARATION';
        priority = 'HIGH';
        notes = 'Guest checking in today';
      } else if (!room.isActive) {
        status = 'MAINTENANCE';
        priority = 'LOW';
        notes = 'Room under maintenance';
      }

      return {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        status,
        priority,
        notes,
        currentGuest: currentBooking?.user.name || null,
        lastCleaned: room.bookings.length > 0 ? 
          new Date(Math.max(...room.bookings.map(b => new Date(b.updatedAt)))) : null,
        amenities: room.amenities,
        images: room.images
      };
    });

    // Group by priority
    const groupedByPriority = {
      HIGH: housekeepingStatus.filter(r => r.priority === 'HIGH'),
      MEDIUM: housekeepingStatus.filter(r => r.priority === 'MEDIUM'),
      LOW: housekeepingStatus.filter(r => r.priority === 'LOW')
    };

    res.json({
      success: true,
      data: {
        rooms: housekeepingStatus,
        groupedByPriority,
        summary: {
          total: housekeepingStatus.length,
          needsCleaning: housekeepingStatus.filter(r => r.status === 'NEEDS_CLEANING').length,
          occupied: housekeepingStatus.filter(r => r.status === 'OCCUPIED').length,
          available: housekeepingStatus.filter(r => r.status === 'AVAILABLE').length,
          maintenance: housekeepingStatus.filter(r => r.status === 'MAINTENANCE').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching housekeeping data:', error);
    res.status(500).json({ error: 'Failed to fetch housekeeping data' });
  }
});

// Update housekeeping status
router.put('/housekeeping/:roomId', 
  requireAuth, 
  requireRole(['OWNER', 'ADMIN']),
  validate({
    status: 'string|required',
    notes: 'string',
    cleanedAt: 'date',
    nextAvailableAt: 'date'
  }),
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const updateData = req.validated;

      // Verify room ownership
      const room = await rooms.findFirst({
        where: { 
          id: roomId,
          hotel: { ownerId: req.user.sub }
        }
      });

      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Update room status (you might want to add a separate housekeeping table)
      const updatedRoom = await rooms.update({
        where: { id: roomId },
        data: {
          isActive: updateData.status !== 'MAINTENANCE',
          updatedAt: new Date()
        }
      });

      // Log housekeeping activity (implement separate logging table)
      res.json({
        success: true,
        data: updatedRoom,
        message: 'Housekeeping status updated successfully'
      });
    } catch (error) {
      console.error('Error updating housekeeping status:', error);
      res.status(500).json({ error: 'Failed to update housekeeping status' });
    }
  }
);

// Get maintenance requests
router.get('/maintenance', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { hotelId, status } = req.query;

    // Mock maintenance requests data (implement maintenance table in schema)
    const maintenanceRequests = [
      {
        id: '1',
        roomId: 'room1',
        roomName: 'Deluxe Room 101',
        hotelId: 'hotel1',
        issue: 'Air conditioning not working',
        priority: 'HIGH',
        status: 'PENDING',
        reportedBy: 'Guest',
        reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        assignedTo: null,
        estimatedCost: 2500,
        completedAt: null
      },
      {
        id: '2',
        roomId: 'room2',
        roomName: 'Standard Room 202',
        hotelId: 'hotel1',
        issue: 'Leaky faucet in bathroom',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        reportedBy: 'Housekeeping',
        reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        assignedTo: 'Maintenance Team',
        estimatedCost: 800,
        completedAt: null
      }
    ];

    res.json({
      success: true,
      data: {
        requests: maintenanceRequests,
        summary: {
          total: maintenanceRequests.length,
          pending: maintenanceRequests.filter(r => r.status === 'PENDING').length,
          inProgress: maintenanceRequests.filter(r => r.status === 'IN_PROGRESS').length,
          completed: maintenanceRequests.filter(r => r.status === 'COMPLETED').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

// Get inventory management
router.get('/inventory', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { hotelId } = req.query;

    // Mock inventory data (implement inventory table in schema)
    const inventory = [
      {
        id: '1',
        itemName: 'Towels',
        category: 'LINEN',
        currentStock: 150,
        minRequired: 100,
        maxStock: 300,
        unitCost: 250,
        lastRestocked: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        supplier: 'Textile Supplies Co.',
        status: 'ADEQUATE'
      },
      {
        id: '2',
        itemName: 'Shampoo Bottles',
        category: 'AMENITIES',
        currentStock: 45,
        minRequired: 80,
        maxStock: 200,
        unitCost: 35,
        lastRestocked: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        supplier: 'Hotel Essentials Ltd.',
        status: 'LOW_STOCK'
      }
    ];

    // Categorize by status
    const categorized = {
      lowStock: inventory.filter(item => item.currentStock <= item.minRequired),
      adequate: inventory.filter(item => 
        item.currentStock > item.minRequired && item.currentStock < item.maxStock
      ),
      overstocked: inventory.filter(item => item.currentStock >= item.maxStock)
    };

    res.json({
      success: true,
      data: {
        inventory,
        categorized,
        summary: {
          totalItems: inventory.length,
          lowStockItems: categorized.lowStock.length,
          totalValue: inventory.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory data' });
  }
});

// Get staff management
router.get('/staff', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { hotelId } = req.query;

    // Mock staff data (implement staff table in schema)
    const staff = [
      {
        id: '1',
        name: 'Raj Kumar',
        position: 'Housekeeping Manager',
        department: 'HOUSEKEEPING',
        email: 'raj.kumar@hotel.com',
        phone: '+91 9876543210',
        status: 'ACTIVE',
        joinDate: new Date('2022-01-15'),
        salary: 25000,
        workingToday: true,
        shift: 'MORNING'
      },
      {
        id: '2',
        name: 'Priya Sharma',
        position: 'Front Desk Executive',
        department: 'FRONT_DESK',
        email: 'priya.sharma@hotel.com',
        phone: '+91 9876543211',
        status: 'ACTIVE',
        joinDate: new Date('2023-03-20'),
        salary: 22000,
        workingToday: true,
        shift: 'EVENING'
      }
    ];

    const departments = ['HOUSEKEEPING', 'FRONT_DESK', 'MAINTENANCE', 'FOOD_BEVERAGE', 'SECURITY'];

    res.json({
      success: true,
      data: {
        staff,
        departments: departments.map(dept => ({
          name: dept,
          count: staff.filter(s => s.department === dept).length,
          activeCount: staff.filter(s => s.department === dept && s.status === 'ACTIVE').length
        })),
        summary: {
          totalStaff: staff.length,
          activeStaff: staff.filter(s => s.status === 'ACTIVE').length,
          workingToday: staff.filter(s => s.workingToday).length,
          totalSalaryCost: staff.reduce((sum, s) => sum + s.salary, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching staff data:', error);
    res.status(500).json({ error: 'Failed to fetch staff data' });
  }
});

// Get reports and analytics
router.get('/reports', requireAuth, requireRole(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { hotelId, reportType, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Get bookings for the period
    const periodBookings = await bookings.findMany({
      where: {
        hotel: { ownerId: req.user.sub },
        createdAt: { gte: start, lte: end }
      },
      include: {
        hotel: { select: { name: true } },
        room: { select: { name: true, type: true } },
        user: { select: { name: true } }
      }
    });

    // Generate different report types
    let reportData = {};

    switch (reportType) {
      case 'REVENUE':
        const revenueByMonth = periodBookings.reduce((acc, booking) => {
          const month = new Date(booking.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'short' });
          acc[month] = (acc[month] || 0) + booking.totalAmount;
          return acc;
        }, {});

        reportData = {
          totalRevenue: periodBookings.reduce((sum, b) => sum + b.totalAmount, 0),
          averageBookingValue: periodBookings.length > 0 ? 
            periodBookings.reduce((sum, b) => sum + b.totalAmount, 0) / periodBookings.length : 0,
          revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue })),
          revenueByHotel: periodBookings.reduce((acc, booking) => {
            acc[booking.hotel.name] = (acc[booking.hotel.name] || 0) + booking.totalAmount;
            return acc;
          }, {})
        };
        break;

      case 'OCCUPANCY':
        reportData = {
          totalBookings: periodBookings.length,
          occupancyByRoomType: periodBookings.reduce((acc, booking) => {
            acc[booking.room.type] = (acc[booking.room.type] || 0) + 1;
            return acc;
          }, {}),
          averageStay: periodBookings.length > 0 ?
            periodBookings.reduce((sum, b) => {
              const days = (new Date(b.checkOut) - new Date(b.checkIn)) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / periodBookings.length : 0
        };
        break;

      case 'GUEST_REVIEWS':
        // Mock review data (integrate with review system)
        reportData = {
          averageRating: 4.2,
          totalReviews: 156,
          ratingDistribution: { 5: 78, 4: 45, 3: 20, 2: 8, 1: 5 },
          commonFeedback: [
            'Clean rooms', 'Good location', 'Helpful staff', 
            'Fast check-in', 'Value for money'
          ]
        };
        break;

      default:
        reportData = { message: 'Invalid report type' };
    }

    res.json({
      success: true,
      data: reportData,
      period: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Error generating reports:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

module.exports = router;
