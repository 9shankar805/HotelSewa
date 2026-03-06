const express = require("express");
const { v4: uuid } = require("uuid");
const { requireAuth } = require("../middleware/auth");
const Groq = require("groq-sdk");

const router = express.Router();

// AI Chat endpoint with Groq
router.post("/ai-chat", async (req, res) => {
  try {
    const { message, userId } = req.body;
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful hotel booking assistant for HotelSewa. Help users find hotels, make bookings, and answer questions about their reservations."
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "I can help you with hotel bookings!";

    res.json({
      success: true,
      message: aiResponse,
      quickReplies: ["Show more", "Book now", "Help"]
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    res.status(500).json({
      success: false,
      message: "I can help you find hotels, check bookings, or answer questions. What would you like to know?"
    });
  }
});

// Get all hotels with filters
router.get("/hotels", async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { city, minPrice, maxPrice, rating, amenities, sortBy } = req.query;

    const where = {
      isActive: true,
      isApproved: true,
    };

    if (city) where.city = { contains: city, mode: "insensitive" };
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
    }
    if (rating) where.rating = { gte: parseFloat(rating) };

    const orderBy = sortBy === "price_low" ? { basePrice: "asc" } : 
                    sortBy === "price_high" ? { basePrice: "desc" } :
                    sortBy === "rating" ? { rating: "desc" } : { createdAt: "desc" };

    const hotels = await prisma.hotel.findMany({
      where,
      orderBy,
      include: {
        rooms: { where: { isActive: true } },
        amenities: true,
        images: true,
      },
    });

    res.json({ success: true, hotels });
  } catch (error) {
    console.error("Get hotels error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch hotels" });
  }
});

// Search hotels
router.get("/hotels/search", async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { q, city, checkIn, checkOut, guests } = req.query;

    const where = {
      isActive: true,
      isApproved: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ],
    };

    if (city) where.city = { contains: city, mode: "insensitive" };

    const hotels = await prisma.hotel.findMany({
      where,
      include: {
        rooms: { where: { isActive: true } },
        amenities: true,
        images: true,
      },
    });

    res.json({ success: true, hotels });
  } catch (error) {
    console.error("Search hotels error:", error);
    res.status(500).json({ success: false, message: "Failed to search hotels" });
  }
});

// Get hotel details
router.get("/hotels/:id", async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        rooms: { where: { isActive: true } },
        amenities: true,
        images: true,
        reviews: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    res.json({ success: true, hotel });
  } catch (error) {
    console.error("Get hotel details error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch hotel details" });
  }
});

// Create booking
router.post("/bookings", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId, roomId, checkIn, checkOut, guests, totalPrice, paymentMethod } = req.body;

    const booking = await prisma.booking.create({
      data: {
        id: uuid(),
        userId: req.user.id,
        hotelId,
        roomId,
        checkInDate: new Date(checkIn),
        checkOutDate: new Date(checkOut),
        numberOfGuests: guests,
        totalPrice,
        paymentMethod,
        status: "pending",
      },
      include: {
        hotel: true,
        room: true,
      },
    });

    res.status(201).json({ success: true, booking, message: "Booking created successfully" });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
});

// Get user bookings
router.get("/bookings", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { status } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        hotel: { include: { images: true } },
        room: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Get booking details
router.get("/bookings/:id", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id, userId: req.user.id },
      include: {
        hotel: { include: { images: true, amenities: true } },
        room: true,
        payment: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.error("Get booking details error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch booking details" });
  }
});

// Cancel booking
router.patch("/bookings/:id/cancel", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Booking already cancelled" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    res.json({ success: true, booking: updatedBooking, message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel booking" });
  }
});

// Create payment
router.post("/payments", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { bookingId, amount, method, transactionId } = req.body;

    const payment = await prisma.payment.create({
      data: {
        id: uuid(),
        bookingId,
        amount,
        method,
        transactionId,
        status: "completed",
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed", paymentStatus: "paid" },
    });

    res.status(201).json({ success: true, payment, message: "Payment successful" });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
});

// Get user profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// Update user profile
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { name, phone, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, avatar },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });

    res.json({ success: true, user, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// Add review
router.post("/reviews", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId, rating, comment } = req.body;

    const review = await prisma.review.create({
      data: {
        id: uuid(),
        userId: req.user.id,
        hotelId,
        rating,
        comment,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    res.status(201).json({ success: true, review, message: "Review added successfully" });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({ success: false, message: "Failed to add review" });
  }
});

// Get wallet balance
router.get("/wallet", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { id: uuid(), userId: req.user.id, balance: 0 },
      });
    }

    res.json({ success: true, balance: wallet.balance, currency: wallet.currency });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch wallet" });
  }
});

// Get wallet transactions
router.get("/wallet/transactions", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
    });

    res.json({ success: true, transactions: wallet?.transactions || [] });
  } catch (error) {
    console.error("Get wallet transactions error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
});

// Add money to wallet
router.post("/wallet/add", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { amount, paymentMethod, transactionId } = req.body;

    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { id: uuid(), userId: req.user.id, balance: 0 },
      });
    }

    const newBalance = wallet.balance + amount;

    await prisma.$transaction([
      prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      prisma.walletTransaction.create({
        data: {
          id: uuid(),
          walletId: wallet.id,
          type: "credit",
          amount,
          description: `Added via ${paymentMethod}`,
          referenceId: transactionId,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
        },
      }),
    ]);

    res.json({ success: true, balance: newBalance, message: "Money added successfully" });
  } catch (error) {
    console.error("Add money error:", error);
    res.status(500).json({ success: false, message: "Failed to add money" });
  }
});

// Get notifications
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
});

// Get coupons
router.get("/coupons", async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        validTo: { gte: new Date() },
      },
    });

    res.json({ success: true, coupons });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

// Apply coupon
router.post("/coupons/apply", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { code, amount } = req.body;

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    if (new Date() < coupon.validFrom || new Date() > coupon.validTo) {
      return res.status(400).json({ success: false, message: "Coupon expired" });
    }

    if (coupon.minAmount && amount < coupon.minAmount) {
      return res.status(400).json({ success: false, message: `Minimum amount ₹${coupon.minAmount} required` });
    }

    let discount = coupon.discountType === "percentage" 
      ? (amount * coupon.discountValue) / 100 
      : coupon.discountValue;

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    res.json({ success: true, discount, finalAmount: amount - discount });
  } catch (error) {
    console.error("Apply coupon error:", error);
    res.status(500).json({ success: false, message: "Failed to apply coupon" });
  }
});

// Get saved hotels
router.get("/saved", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const saved = await prisma.savedHotel.findMany({
      where: { userId: req.user.id },
      include: { hotel: { include: { images: true, rooms: { where: { status: "available" }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, hotels: saved.map(s => s.hotel) });
  } catch (error) {
    console.error("Get saved hotels error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch saved hotels" });
  }
});

// Add to saved
router.post("/saved/:hotelId", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;

    await prisma.savedHotel.create({
      data: { id: uuid(), userId: req.user.id, hotelId },
    });

    res.status(201).json({ success: true, message: "Hotel saved successfully" });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, message: "Hotel already saved" });
    }
    console.error("Save hotel error:", error);
    res.status(500).json({ success: false, message: "Failed to save hotel" });
  }
});

// Remove from saved
router.delete("/saved/:hotelId", requireAuth, async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { hotelId } = req.params;

    await prisma.savedHotel.deleteMany({
      where: { userId: req.user.id, hotelId },
    });

    res.json({ success: true, message: "Hotel removed from saved" });
  } catch (error) {
    console.error("Remove saved hotel error:", error);
    res.status(500).json({ success: false, message: "Failed to remove saved hotel" });
  }
});

module.exports = router;
