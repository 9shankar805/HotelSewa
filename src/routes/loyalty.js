const express = require('express');
const router = express.Router();
const loyaltyProgram = require('../lib/loyaltyProgram');
const { validate } = require('../lib/validate');
const { requireAuth } = require('../middleware/auth');

// Initialize or get user's loyalty membership
router.get('/membership', requireAuth, async (req, res) => {
  try {
    let membership = await loyaltyProgram.getMembership(req.user.sub);
    
    if (!membership) {
      membership = await loyaltyProgram.initializeMembership(req.user.sub);
    }

    res.json({
      success: true,
      data: membership
    });
  } catch (error) {
    console.error('Error getting membership:', error);
    res.status(500).json({ error: 'Failed to get membership details' });
  }
});

// Get loyalty statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await loyaltyProgram.getLoyaltyStats(req.user.sub);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting loyalty stats:', error);
    res.status(500).json({ error: 'Failed to get loyalty statistics' });
  }
});

// Get loyalty discount for booking
router.get('/discount', requireAuth, async (req, res) => {
  try {
    const { amount } = req.query;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount parameter is required' });
    }

    const discount = await loyaltyProgram.applyLoyaltyDiscount(req.user.sub, parseInt(amount));
    
    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    console.error('Error getting loyalty discount:', error);
    res.status(500).json({ error: 'Failed to calculate loyalty discount' });
  }
});

// Award points (admin function or specific actions)
router.post('/award-points', 
  requireAuth,
  validate({
    userId: 'string|required',
    points: 'number|required',
    reason: 'string|required',
    description: 'string'
  }),
  async (req, res) => {
    try {
      // Only allow users to award points to themselves or admins to award to anyone
      if (req.user.role !== 'ADMIN' && req.validated.userId !== req.user.sub) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { userId, points, reason, description } = req.validated;
      
      const membership = await loyaltyProgram.awardPoints(userId, points, reason, description);
      
      res.json({
        success: true,
        data: membership,
        message: `Successfully awarded ${points} points`
      });
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(500).json({ error: 'Failed to award points' });
    }
  }
);

// Redeem points for rewards
router.post('/redeem', 
  requireAuth,
  validate({
    points: 'number|required',
    rewardType: 'string|required',
    description: 'string'
  }),
  async (req, res) => {
    try {
      const { points, rewardType, description } = req.validated;
      
      const membership = await loyaltyProgram.redeemPoints(
        req.user.sub, 
        points, 
        rewardType, 
        description
      );
      
      res.json({
        success: true,
        data: membership,
        message: `Successfully redeemed ${points} points for ${rewardType}`
      });
    } catch (error) {
      console.error('Error redeeming points:', error);
      if (error.message === 'Insufficient points') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to redeem points' });
    }
  }
);

// Get available rewards for redemption
router.get('/rewards', requireAuth, async (req, res) => {
  try {
    const membership = await loyaltyProgram.getMembership(req.user.sub);
    const userPoints = membership ? membership.points : 0;
    
    const availableRewards = loyaltyProgram.getAvailableRewards(userPoints);
    
    res.json({
      success: true,
      data: {
        userPoints,
        rewards: availableRewards
      }
    });
  } catch (error) {
    console.error('Error getting available rewards:', error);
    res.status(500).json({ error: 'Failed to get available rewards' });
  }
});

// Process booking loyalty points (called from booking system)
router.post('/process-booking', 
  requireAuth,
  validate({
    bookingAmount: 'number|required',
    bookingId: 'string|required'
  }),
  async (req, res) => {
    try {
      const { bookingAmount, bookingId } = req.validated;
      
      const pointsEarned = await loyaltyProgram.processBooking(
        req.user.sub, 
        bookingAmount, 
        bookingId
      );
      
      res.json({
        success: true,
        data: { pointsEarned },
        message: `Earned ${pointsEarned} points from this booking`
      });
    } catch (error) {
      console.error('Error processing booking loyalty:', error);
      res.status(500).json({ error: 'Failed to process booking loyalty' });
    }
  }
);

// Get tier benefits
router.get('/tiers', async (req, res) => {
  try {
    const tiers = loyaltyProgram.tiers;
    
    // Format tiers for frontend display
    const formattedTiers = Object.entries(tiers).map(([key, tier]) => ({
      id: key,
      name: tier.name,
      minPoints: tier.minPoints,
      benefits: tier.benefits,
      pointsMultiplier: tier.pointsMultiplier,
      discountPercentage: tier.discountPercentage
    }));
    
    res.json({
      success: true,
      data: formattedTiers
    });
  } catch (error) {
    console.error('Error getting tiers:', error);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});

// Award points for review (called from review system)
router.post('/award-review-points', 
  requireAuth,
  validate({
    bookingId: 'string|required'
  }),
  async (req, res) => {
    try {
      const { bookingId } = req.validated;
      
      // Check if user hasn't already received points for this booking review
      const existingReward = await prisma.loyaltyReward.findFirst({
        where: {
          membership: { userId: req.user.sub },
          description: { contains: `review for booking ${bookingId}` },
          type: 'POINTS_BONUS'
        }
      });

      if (existingReward) {
        return res.status(400).json({ error: 'Points already awarded for this review' });
      }

      const membership = await loyaltyProgram.awardPoints(
        req.user.sub, 
        loyaltyProgram.pointsRules.REVIEW, 
        'REVIEW', 
        `Points for writing review for booking ${bookingId}`
      );
      
      res.json({
        success: true,
        data: membership,
        message: `Earned ${loyaltyProgram.pointsRules.REVIEW} points for your review`
      });
    } catch (error) {
      console.error('Error awarding review points:', error);
      res.status(500).json({ error: 'Failed to award review points' });
    }
  }
);

// Referral system (bonus for referring new customers)
router.post('/referral-bonus', 
  requireAuth,
  validate({
    referredUserId: 'string|required'
  }),
  async (req, res) => {
    try {
      const { referredUserId } = req.validated;
      
      // Check if referred user has made their first booking
      const firstBooking = await prisma.booking.findFirst({
        where: { 
          userId: referredUserId,
          status: 'COMPLETED'
        }
      });

      if (!firstBooking) {
        return res.status(400).json({ error: 'Referred user must complete a booking first' });
      }

      // Check if referral bonus has already been awarded
      const existingReward = await prisma.loyaltyReward.findFirst({
        where: {
          membership: { userId: req.user.sub },
          description: { contains: `referral of ${referredUserId}` },
          type: 'POINTS_BONUS'
        }
      });

      if (existingReward) {
        return res.status(400).json({ error: 'Referral bonus already awarded' });
      }

      const membership = await loyaltyProgram.awardPoints(
        req.user.sub, 
        loyaltyProgram.pointsRules.REFERRAL, 
        'REFERRAL', 
        `Referral bonus for referring user ${referredUserId}`
      );
      
      res.json({
        success: true,
        data: membership,
        message: `Earned ${loyaltyProgram.pointsRules.REFERRAL} points for successful referral`
      });
    } catch (error) {
      console.error('Error awarding referral bonus:', error);
      res.status(500).json({ error: 'Failed to award referral bonus' });
    }
  }
);

module.exports = router;
