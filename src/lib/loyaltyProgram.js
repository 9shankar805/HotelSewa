const { users, loyaltyMemberships, loyaltyRewards, bookings } = require('../data/store');
const prisma = require('../lib/prisma');

class LoyaltyProgram {
  constructor() {
    this.tiers = {
      BRONZE: {
        name: 'Bronze',
        minPoints: 0,
        benefits: ['5% cashback on bookings', 'Welcome bonus points'],
        pointsMultiplier: 1.0,
        discountPercentage: 5
      },
      SILVER: {
        name: 'Silver',
        minPoints: 1000,
        benefits: ['10% cashback on bookings', 'Priority check-in', 'Room upgrade when available'],
        pointsMultiplier: 1.2,
        discountPercentage: 10
      },
      GOLD: {
        name: 'Gold',
        minPoints: 3000,
        benefits: ['15% cashback on bookings', 'Free breakfast', 'Late check-out', 'Priority support'],
        pointsMultiplier: 1.5,
        discountPercentage: 15
      },
      PLATINUM: {
        name: 'Platinum',
        minPoints: 7000,
        benefits: ['20% cashback on bookings', 'Free room upgrades', 'Airport transfers', 'Dedicated concierge'],
        pointsMultiplier: 2.0,
        discountPercentage: 20
      },
      DIAMOND: {
        name: 'Diamond',
        minPoints: 15000,
        benefits: ['25% cashback on bookings', 'Complimentary stays', 'VIP lounge access', 'Personalized service'],
        pointsMultiplier: 2.5,
        discountPercentage: 25
      }
    };

    this.pointsRules = {
      BOOKING: 10,      // Points per Rs.100 spent
      REVIEW: 50,       // Points for writing a review
      REFERRAL: 200,    // Points for successful referral
      BIRTHDAY: 100,    // Birthday bonus points
      ANNIVERSARY: 150  // Membership anniversary bonus
    };
  }

  /**
   * Initialize loyalty membership for a user
   */
  async initializeMembership(userId) {
    try {
      const user = await users.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const existingMembership = await loyaltyMemberships.findUnique({
        where: { userId }
      });

      if (existingMembership) {
        return existingMembership;
      }

      const membership = await loyaltyMemberships.create({
        data: {
          userId,
          tier: 'BRONZE',
          points: 100, // Welcome bonus
          benefits: this.tiers.BRONZE.benefits
        }
      });

      // Update user's loyalty info
      await users.update({
        where: { id: userId },
        data: {
          loyaltyTier: 'BRONZE',
          loyaltyPoints: 100
        }
      });

      return membership;
    } catch (error) {
      console.error('Error initializing membership:', error);
      throw error;
    }
  }

  /**
   * Award points to a user
   */
  async awardPoints(userId, points, reason, description = '') {
    try {
      const membership = await this.getMembership(userId);
      if (!membership) {
        await this.initializeMembership(userId);
        return this.awardPoints(userId, points, reason, description);
      }

      const newPoints = membership.points + points;
      const newTier = this.calculateTier(newPoints);

      // Update membership
      const updatedMembership = await loyaltyMemberships.update({
        where: { userId },
        data: {
          points: newPoints,
          tier: newTier,
          benefits: this.tiers[newTier].benefits,
          lastActivity: new Date()
        }
      });

      // Update user
      await users.update({
        where: { id: userId },
        data: {
          loyaltyTier: newTier,
          loyaltyPoints: newPoints
        }
      });

      // Create reward record
      await loyaltyRewards.create({
        data: {
          membershipId: membership.id,
          type: 'POINTS_BONUS',
          points,
          description: description || `Points awarded for ${reason}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year expiry
        }
      });

      // Check for tier upgrade
      if (newTier !== membership.tier) {
        await this.handleTierUpgrade(userId, newTier);
      }

      return updatedMembership;
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Redeem points for rewards
   */
  async redeemPoints(userId, points, rewardType, description = '') {
    try {
      const membership = await this.getMembership(userId);
      if (!membership) {
        throw new Error('User not a loyalty member');
      }

      if (membership.points < points) {
        throw new Error('Insufficient points');
      }

      const newPoints = membership.points - points;
      const newTier = this.calculateTier(newPoints);

      // Update membership
      const updatedMembership = await loyaltyMemberships.update({
        where: { userId },
        data: {
          points: newPoints,
          tier: newTier,
          benefits: this.tiers[newTier].benefits,
          lastActivity: new Date()
        }
      });

      // Update user
      await users.update({
        where: { id: userId },
        data: {
          loyaltyTier: newTier,
          loyaltyPoints: newPoints
        }
      });

      // Create reward record
      await loyaltyRewards.create({
        data: {
          membershipId: membership.id,
          type: rewardType,
          points: -points, // Negative for redemption
          description: description || `Points redeemed for ${rewardType}`,
          expiryDate: new Date()
        }
      });

      return updatedMembership;
    } catch (error) {
      console.error('Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * Calculate user's tier based on points
   */
  calculateTier(points) {
    const tierEntries = Object.entries(this.tiers).reverse(); // Start from highest tier
    
    for (const [tierName, tierData] of tierEntries) {
      if (points >= tierData.minPoints) {
        return tierName;
      }
    }
    
    return 'BRONZE';
  }

  /**
   * Get membership details for a user
   */
  async getMembership(userId) {
    return await loyaltyMemberships.findUnique({
      where: { userId },
      include: {
        rewards: {
          where: { expiryDate: { gt: new Date() } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Process booking and award points
   */
  async processBooking(userId, bookingAmount, bookingId) {
    try {
      const membership = await this.getMembership(userId);
      if (!membership) {
        await this.initializeMembership(userId);
        return this.processBooking(userId, bookingAmount, bookingId);
      }

      const tier = this.tiers[membership.tier];
      const pointsEarned = Math.floor((bookingAmount / 100) * this.pointsRules.BOOKING * tier.pointsMultiplier);

      await this.awardPoints(userId, pointsEarned, 'BOOKING', `Points from booking ${bookingId}`);

      // Update booking stats
      await loyaltyMemberships.update({
        where: { userId },
        data: {
          totalBookings: { increment: 1 },
          totalSpent: { increment: bookingAmount }
        }
      });

      return pointsEarned;
    } catch (error) {
      console.error('Error processing booking for loyalty:', error);
      throw error;
    }
  }

  /**
   * Get discount for a user based on their tier
   */
  async getLoyaltyDiscount(userId) {
    try {
      const membership = await this.getMembership(userId);
      if (!membership) {
        return 0;
      }

      return this.tiers[membership.tier].discountPercentage;
    } catch (error) {
      console.error('Error getting loyalty discount:', error);
      return 0;
    }
  }

  /**
   * Apply loyalty discount to booking
   */
  async applyLoyaltyDiscount(userId, originalPrice) {
    const discountPercentage = await this.getLoyaltyDiscount(userId);
    const discountAmount = Math.floor(originalPrice * discountPercentage / 100);
    const finalPrice = originalPrice - discountAmount;

    return {
      originalPrice,
      discountPercentage,
      discountAmount,
      finalPrice,
      pointsEarned: Math.floor((finalPrice / 100) * this.pointsRules.BOOKING)
    };
  }

  /**
   * Handle tier upgrade
   */
  async handleTierUpgrade(userId, newTier) {
    try {
      const tierBenefits = this.tiers[newTier];
      
      // Award bonus points for tier upgrade
      const upgradeBonus = {
        SILVER: 200,
        GOLD: 500,
        PLATINUM: 1000,
        DIAMOND: 2500
      };

      if (upgradeBonus[newTier]) {
        await this.awardPoints(userId, upgradeBonus[newTier], 'TIER_UPGRADE', `Welcome to ${tierBenefits.name}!`);
      }

      // Here you could also send notification/email about tier upgrade
      console.log(`User ${userId} upgraded to ${newTier} tier`);
      
    } catch (error) {
      console.error('Error handling tier upgrade:', error);
    }
  }

  /**
   * Get available rewards for redemption
   */
  getAvailableRewards(points) {
    return [
      {
        type: 'DISCOUNT',
        name: '10% Discount',
        pointsRequired: 500,
        description: 'Get 10% off your next booking'
      },
      {
        type: 'DISCOUNT',
        name: '25% Discount',
        pointsRequired: 1200,
        description: 'Get 25% off your next booking'
      },
      {
        type: 'FREE_NIGHT',
        name: 'Free Night (Standard Room)',
        pointsRequired: 3000,
        description: 'One free night in any standard room'
      },
      {
        type: 'UPGRADE',
        name: 'Room Upgrade',
        pointsRequired: 800,
        description: 'Upgrade your room by one category'
      },
      {
        type: 'CASHBACK',
        name: 'Rs.500 Cashback',
        pointsRequired: 600,
        description: 'Get Rs.500 cashback to your wallet'
      }
    ];
  }

  /**
   * Get user's loyalty statistics
   */
  async getLoyaltyStats(userId) {
    try {
      const membership = await this.getMembership(userId);
      if (!membership) {
        return null;
      }

      const currentTier = this.tiers[membership.tier];
      const nextTierName = this.getNextTier(membership.tier);
      const nextTier = nextTierName ? this.tiers[nextTierName] : null;

      return {
        currentTier: membership.tier,
        currentPoints: membership.points,
        totalBookings: membership.totalBookings,
        totalSpent: membership.totalSpent,
        memberSince: membership.memberSince,
        benefits: currentTier.benefits,
        pointsMultiplier: currentTier.pointsMultiplier,
        discountPercentage: currentTier.discountPercentage,
        nextTier: nextTierName ? {
          name: nextTier.name,
          pointsNeeded: nextTier.minPoints - membership.points,
          benefits: nextTier.benefits
        } : null,
        availableRewards: this.getAvailableRewards(membership.points)
      };
    } catch (error) {
      console.error('Error getting loyalty stats:', error);
      throw error;
    }
  }

  /**
   * Get the next tier name
   */
  getNextTier(currentTier) {
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const currentIndex = tierOrder.indexOf(currentTier);
    return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  }
}

module.exports = new LoyaltyProgram();