const express = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'general'));
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${file.originalname.split('.').pop()}`);
  }
});
const upload = multer({ storage });

// 1. MESSAGING APIs
router.get('/messages/conversations', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const conversations = await prisma.conversation.findMany({
      where: { ownerId },
      include: {
        guest: { select: { name: true, profileImage: true } },
        booking: { select: { id: true, checkInDate: true } },
        _count: { select: { messages: { where: { isRead: false, receiverId: ownerId } } } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/messages/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { name: true, profileImage: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/messages/:conversationId/send', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, receiverId } = req.body;
    const senderId = req.user.id;

    const message = await prisma.message.create({
      data: { conversationId, senderId, receiverId, content }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: content, lastMessageAt: new Date() }
    });

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. PROFILE APIs
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, profileImage: true, createdAt: true }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/profile/upload-avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const profileImage = `/uploads/general/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage }
    });
    res.json({ success: true, data: { profileImage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. NOTIFICATIONS APIs
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. ANALYTICS APIs
router.get('/analytics/overview', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const totalBookings = await prisma.booking.count({ where: { hotelId: { in: hotelIds } } });
    const totalRevenue = await prisma.booking.aggregate({
      where: { hotelId: { in: hotelIds }, paymentStatus: 'PAID' },
      _sum: { totalAmount: true }
    });

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalHotels: hotels.length,
        occupancyRate: 75.5
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. OFFERS APIs
router.get('/offers', requireAuth, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const hotels = await prisma.hotel.findMany({ where: { ownerId } });
    const hotelIds = hotels.map(h => h.id);

    const offers = await prisma.offer.findMany({
      where: { hotelId: { in: hotelIds } },
      include: { hotel: { select: { name: true } } }
    });
    res.json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/offers', requireAuth, async (req, res) => {
  try {
    const offer = await prisma.offer.create({ data: req.body });
    res.json({ success: true, data: offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. AMENITIES APIs
router.get('/amenities', requireAuth, async (req, res) => {
  try {
    const amenities = await prisma.amenity.findMany({ where: { isActive: true } });
    res.json({ success: true, data: amenities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. CALENDAR APIs
router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const { hotelId, month, year } = req.query;
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        checkInDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1)
        }
      },
      include: { room: true, user: { select: { name: true } } }
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. DOCUMENTS APIs
router.get('/documents', requireAuth, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/documents/upload', requireAuth, upload.single('document'), async (req, res) => {
  try {
    const { name, type, hotelId } = req.body;
    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        hotelId,
        name,
        type,
        url: `/uploads/general/${req.file.filename}`,
        size: req.file.size
      }
    });
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. SUPPORT APIs
router.get('/support/tickets', requireAuth, async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/support/tickets', requireAuth, async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.create({
      data: { ...req.body, userId: req.user.id }
    });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 10. WITHDRAWALS APIs
router.get('/withdrawals', requireAuth, async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/withdrawals/request', requireAuth, async (req, res) => {
  try {
    const withdrawal = await prisma.withdrawal.create({
      data: { ...req.body, userId: req.user.id }
    });
    res.json({ success: true, data: withdrawal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 11. SETTINGS APIs
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, verified: true }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 12. UPLOAD APIs
router.post('/upload/hotel/:hotelId', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files.map(file => `/uploads/general/${file.filename}`);
    res.json({ success: true, data: { images } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/upload/room/:roomId', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const images = req.files.map(file => `/uploads/general/${file.filename}`);
    res.json({ success: true, data: { images } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
