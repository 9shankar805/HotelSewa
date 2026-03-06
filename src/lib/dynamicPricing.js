const { rooms, bookings, dynamicPrices, seasonalDemands, eventDemands } = require('../data/store');
const prisma = require('../lib/prisma');

class DynamicPricingEngine {
  constructor() {
    this.baseDemandScore = 1.0;
    this.maxPriceMultiplier = 3.0;
    this.minPriceMultiplier = 0.4;
  }

  /**
   * Calculate dynamic price for a room on a specific date
   */
  async calculateDynamicPrice(roomId, date) {
    try {
      // Get room details
      const room = await rooms.findUnique({
        where: { id: roomId },
        include: { hotel: true }
      });

      if (!room) {
        throw new Error('Room not found');
      }

      // Check if dynamic price already exists for this date
      const existingPrice = await dynamicPrices.findUnique({
        where: { roomId_date: { roomId, date: new Date(date) } }
      });

      if (existingPrice) {
        return {
          basePrice: room.basePrice,
          finalPrice: existingPrice.finalPrice,
          factors: {
            occupancy: existingPrice.occupancyRate,
            demand: existingPrice.demandScore,
            seasonal: null,
            events: null
          }
        };
      }

      // Calculate various pricing factors
      const occupancyRate = await this.calculateOccupancyRate(roomId, date);
      const demandScore = this.calculateDemandScore(room.hotel.city, date, occupancyRate);
      const seasonalMultiplier = await this.getSeasonalMultiplier(room.hotel.city, date);
      const eventMultiplier = await this.getEventMultiplier(room.hotel.city, date);
      const customRules = await this.applyCustomPricingRules(roomId, date);

      // Calculate final price
      let finalMultiplier = 1.0;
      
      // Apply factors with weights
      finalMultiplier *= (0.3 * occupancyRate); // 30% weight to occupancy
      finalMultiplier *= (0.4 * demandScore);   // 40% weight to demand
      finalMultiplier *= seasonalMultiplier;    // Seasonal adjustment
      finalMultiplier *= eventMultiplier;       // Event adjustment
      
      // Apply custom rules
      finalMultiplier *= customRules.multiplier;

      // Apply bounds
      finalMultiplier = Math.max(this.minPriceMultiplier, 
                          Math.min(this.maxPriceMultiplier, finalMultiplier));

      const finalPrice = Math.round(room.basePrice * finalMultiplier);

      // Store dynamic price
      await dynamicPrices.create({
        data: {
          roomId,
          date: new Date(date),
          basePrice: room.basePrice,
          finalPrice,
          occupancyRate,
          demandScore,
        }
      });

      return {
        basePrice: room.basePrice,
        finalPrice,
        factors: {
          occupancy: occupancyRate,
          demand: demandScore,
          seasonal: seasonalMultiplier,
          events: eventMultiplier,
          customRules: customRules.applied
        }
      };

    } catch (error) {
      console.error('Error calculating dynamic price:', error);
      throw error;
    }
  }

  /**
   * Calculate occupancy rate for a room on a specific date
   */
  async calculateOccupancyRate(roomId, date) {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const bookedRooms = await bookings.count({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: nextDate },
        checkOut: { gt: targetDate }
      }
    });

    // For this demo, assuming each room type has multiple rooms
    // In reality, you'd get this from room inventory
    const totalRooms = 10; // This should come from room inventory
    const occupancyRate = totalRooms > 0 ? (bookedRooms / totalRooms) : 0;

    // Convert occupancy rate to pricing multiplier
    // Higher occupancy = higher price
    return Math.max(0.5, Math.min(2.0, 1.0 + (occupancyRate * 1.5)));
  }

  /**
   * Calculate demand score based on various factors
   */
  calculateDemandScore(city, date, occupancyRate) {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let demandScore = this.baseDemandScore;

    // Weekend demand
    if (isWeekend) {
      demandScore += 0.3;
    }

    // City-specific demand patterns
    const cityDemand = {
      'Mumbai': 1.2,
      'Delhi': 1.3,
      'Bangalore': 1.25,
      'Goa': 1.4,
      'Jaipur': 1.15
    };

    demandScore *= cityDemand[city] || 1.0;

    // Historical booking patterns (simplified)
    demandScore *= (1 + (occupancyRate * 0.5));

    return Math.max(0.7, Math.min(2.5, demandScore));
  }

  /**
   * Get seasonal demand multiplier
   */
  async getSeasonalMultiplier(city, date) {
    const currentDate = new Date(date);
    
    const seasonalDemand = await seasonalDemands.findFirst({
      where: {
        city,
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
        isActive: true
      }
    });

    return seasonalDemand ? seasonalDemand.demandMultiplier : 1.0;
  }

  /**
   * Get event-based demand multiplier
   */
  async getEventMultiplier(city, date) {
    const currentDate = new Date(date);
    
    const eventDemand = await eventDemands.findMany({
      where: {
        city,
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
        isActive: true
      }
    });

    if (eventDemand.length === 0) return 1.0;

    // If multiple events, take the highest multiplier
    const maxMultiplier = Math.max(...eventDemand.map(e => e.demandMultiplier));
    return maxMultiplier;
  }

  /**
   * Apply custom pricing rules
   */
  async applyCustomPricingRules(roomId, date) {
    const pricingRules = await prisma.pricingRule.findMany({
      where: {
        roomId,
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: new Date(date) }, endDate: { gte: new Date(date) } }
        ]
      },
      orderBy: { priority: 'desc' }
    });

    let multiplier = 1.0;
    const applied = [];

    for (const rule of pricingRules) {
      if (this.evaluateRuleConditions(rule, date)) {
        switch (rule.ruleType) {
          case 'PERCENTAGE':
            multiplier *= (1 + rule.value / 100);
            break;
          case 'FIXED_AMOUNT':
            // Fixed amount rules would be applied differently
            applied.push(`${rule.name}: ${rule.value}`);
            break;
          case 'ADVANCE_BOOKING':
            const daysUntil = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntil >= rule.value) {
              multiplier *= 0.9; // 10% discount for advance booking
            }
            break;
          case 'MIN_STAY':
            // This would need booking context to apply properly
            applied.push(`${rule.name}: ${rule.value}+ nights`);
            break;
        }
      }
    }

    return { multiplier, applied };
  }

  /**
   * Evaluate rule conditions
   */
  evaluateRuleConditions(rule, date) {
    if (!rule.conditions) return true;

    try {
      const conditions = JSON.parse(rule.conditions);
      const currentDate = new Date(date);
      const dayOfWeek = currentDate.getDay();

      // Check day conditions
      if (conditions.days) {
        const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
        const currentDay = dayMap[dayOfWeek];
        if (!conditions.days.includes(currentDay)) {
          return false;
        }
      }

      // Check date range conditions
      if (conditions.dateRange) {
        const { start, end } = conditions.dateRange;
        if (start && currentDate < new Date(start)) return false;
        if (end && currentDate > new Date(end)) return false;
      }

      return true;
    } catch (error) {
      console.error('Error evaluating rule conditions:', error);
      return true; // Apply rule if conditions can't be evaluated
    }
  }

  /**
   * Generate pricing for a date range
   */
  async generatePricingForRange(roomId, startDate, endDate) {
    const prices = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const price = await this.calculateDynamicPrice(roomId, new Date(date));
      prices.push({
        date: new Date(date),
        ...price
      });
    }

    return prices;
  }

  /**
   * Update demand scores based on market trends
   */
  async updateDemandScores() {
    // This would typically integrate with external data sources
    // For now, we'll simulate some basic trend analysis
    
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Goa', 'Jaipur'];
    
    for (const city of cities) {
      // Simulate market trend analysis
      const trendMultiplier = 0.9 + Math.random() * 0.3; // 0.9 to 1.2
      
      // Update seasonal demands based on trends
      await seasonalDemands.updateMany({
        where: { city, isActive: true },
        data: {
          demandMultiplier: { multiply: trendMultiplier }
        }
      });
    }
  }
}

module.exports = new DynamicPricingEngine();