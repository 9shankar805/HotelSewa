const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Submit a review (only after checkout)
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const userId = req.user.id;

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
        status: 'CHECKED_OUT'
      },
      include: { hotel: true }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not eligible for review' });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: bookingId }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'Review already submitted for this booking' });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment: comment || null,
        userId: userId,
        hotelId: booking.hotelId,
        bookingId: bookingId
      },
      include: {
        user: { select: { name: true, avatar: true } },
        booking: { select: { checkOut: true } }
      }
    });

    // Update hotel rating
    await updateHotelRating(booking.hotelId);

    res.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
        stayDate: review.booking.checkOut
      }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for a hotel
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    const skip = (page - 1) * limit;
    
    let orderBy = { createdAt: 'desc' }; // Default: most recent
    if (sortBy === 'rating_high') orderBy = { rating: 'desc' };
    if (sortBy === 'rating_low') orderBy = { rating: 'asc' };

    const reviews = await prisma.review.findMany({
      where: { hotelId },
      include: {
        user: { select: { name: true, avatar: true } },
        booking: { select: { checkOut: true } }
      },
      orderBy,
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const totalReviews = await prisma.review.count({
      where: { hotelId }
    });

    // Get rating distribution
    const ratingStats = await prisma.review.groupBy({
      by: ['rating'],
      where: { hotelId },
      _count: { rating: true }
    });

    const ratingDistribution = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    ratingStats.forEach(stat => {
      ratingDistribution[stat.rating] = stat._count.rating;
    });

    res.json({
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        user: review.user,
        stayDate: review.booking.checkOut
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasMore: skip + reviews.length < totalReviews
      },
      ratingDistribution
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get user's reviews
router.get('/my-reviews', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        hotel: { select: { name: true, images: true, city: true } },
        booking: { select: { checkIn: true, checkOut: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const totalReviews = await prisma.review.count({
      where: { userId }
    });

    res.json({
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        hotel: review.hotel,
        stayPeriod: {
          checkIn: review.booking.checkIn,
          checkOut: review.booking.checkOut
        }
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch your reviews' });
  }
});

// Get pending reviews (bookings eligible for review)
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingBookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        status: 'CHECKED_OUT',
        review: null // No review submitted yet
      },
      include: {
        hotel: { select: { name: true, images: true, city: true } },
        room: { select: { name: true, type: true } }
      },
      orderBy: { checkOut: 'desc' }
    });

    res.json({
      pendingReviews: pendingBookings.map(booking => ({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        hotel: booking.hotel,
        room: booking.room,
        stayPeriod: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut
        },
        totalAmount: booking.totalAmount
      }))
    });

  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

// Update hotel rating (helper function)
async function updateHotelRating(hotelId) {
  try {
    const reviews = await prisma.review.findMany({
      where: { hotelId },
      select: { rating: true }
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      await prisma.hotel.update({
        where: { id: hotelId },
        data: {
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          totalReviews: reviews.length
        }
      });
    }
  } catch (error) {
    console.error('Update hotel rating error:', error);
  }
}

module.exports = router;
