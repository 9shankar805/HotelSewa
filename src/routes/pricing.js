const express = require('express');
const router = express.Router();
const dynamicPricing = require('../lib/dynamicPricing');
const { validate } = require('../lib/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get dynamic price for a room on specific date
router.get('/rooms/:roomId/price', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const pricing = await dynamicPricing.calculateDynamicPrice(roomId, date);
    
    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error getting dynamic price:', error);
    res.status(500).json({ error: 'Failed to calculate dynamic price' });
  }
});

// Get pricing for a date range
router.get('/rooms/:roomId/pricing-range', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const pricing = await dynamicPricing.generatePricingForRange(roomId, startDate, endDate);
    
    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error getting pricing range:', error);
    res.status(500).json({ error: 'Failed to generate pricing range' });
  }
});

// Create custom pricing rule
router.post('/rooms/:roomId/rules', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  validate({
    ruleType: 'string|required',
    name: 'string|required',
    value: 'number|required',
    startDate: 'date',
    endDate: 'date',
    priority: 'number',
    conditions: 'object'
  }),
  async (req, res) => {
    try {
      const { roomId } = req.params;
      const ruleData = req.validated;

      // Verify ownership if user is OWNER
      if (req.user.role === 'OWNER') {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { hotel: true }
        });

        if (!room || room.hotel.ownerId !== req.user.sub) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const rule = await prisma.pricingRule.create({
        data: {
          ...ruleData,
          roomId,
          conditions: ruleData.conditions || null
        }
      });

      res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      console.error('Error creating pricing rule:', error);
      res.status(500).json({ error: 'Failed to create pricing rule' });
    }
  }
);

// Get pricing rules for a room
router.get('/rooms/:roomId/rules', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Verify ownership if user is OWNER
    if (req.user.role === 'OWNER') {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { hotel: true }
      });

      if (!room || room.hotel.ownerId !== req.user.sub) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const rules = await prisma.pricingRule.findMany({
      where: { roomId },
      orderBy: { priority: 'desc' }
    });

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error getting pricing rules:', error);
    res.status(500).json({ error: 'Failed to get pricing rules' });
  }
});

// Update pricing rule
router.put('/rules/:ruleId', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  validate({
    name: 'string',
    value: 'number',
    isActive: 'boolean',
    priority: 'number',
    conditions: 'object'
  }),
  async (req, res) => {
    try {
      const { ruleId } = req.params;
      const updateData = req.validated;

      // Get rule and verify ownership
      const rule = await prisma.pricingRule.findUnique({
        where: { id: ruleId },
        include: { room: { include: { hotel: true } } }
      });

      if (!rule) {
        return res.status(404).json({ error: 'Pricing rule not found' });
      }

      if (req.user.role === 'OWNER' && rule.room.hotel.ownerId !== req.user.sub) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedRule = await prisma.pricingRule.update({
        where: { id: ruleId },
        data: updateData
      });

      res.json({
        success: true,
        data: updatedRule
      });
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      res.status(500).json({ error: 'Failed to update pricing rule' });
    }
  }
);

// Delete pricing rule
router.delete('/rules/:ruleId', 
  requireAuth,
  requireRole(['OWNER', 'ADMIN']),
  async (req, res) => {
    try {
      const { ruleId } = req.params;

      // Get rule and verify ownership
      const rule = await prisma.pricingRule.findUnique({
        where: { id: ruleId },
        include: { room: { include: { hotel: true } } }
      });

      if (!rule) {
        return res.status(404).json({ error: 'Pricing rule not found' });
      }

      if (req.user.role === 'OWNER' && rule.room.hotel.ownerId !== req.user.sub) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.pricingRule.delete({
        where: { id: ruleId }
      });

      res.json({
        success: true,
        message: 'Pricing rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting pricing rule:', error);
      res.status(500).json({ error: 'Failed to delete pricing rule' });
    }
  }
);

// Create seasonal demand
router.post('/seasonal-demands', 
  requireAuth,
  requireRole(['ADMIN']),
  validate({
    city: 'string|required',
    season: 'string|required',
    demandMultiplier: 'number|required',
    startDate: 'date|required',
    endDate: 'date|required'
  }),
  async (req, res) => {
    try {
      const seasonalDemand = await prisma.seasonalDemand.create({
        data: req.validated
      });

      res.json({
        success: true,
        data: seasonalDemand
      });
    } catch (error) {
      console.error('Error creating seasonal demand:', error);
      res.status(500).json({ error: 'Failed to create seasonal demand' });
    }
  }
);

// Create event demand
router.post('/event-demands', 
  requireAuth,
  requireRole(['ADMIN']),
  validate({
    name: 'string|required',
    city: 'string|required',
    venue: 'string',
    startDate: 'date|required',
    endDate: 'date|required',
    demandMultiplier: 'number|required'
  }),
  async (req, res) => {
    try {
      const eventDemand = await prisma.eventDemand.create({
        data: req.validated
      });

      res.json({
        success: true,
        data: eventDemand
      });
    } catch (error) {
      console.error('Error creating event demand:', error);
      res.status(500).json({ error: 'Failed to create event demand' });
    }
  }
);

// Update demand scores (Admin function)
router.post('/update-demand-scores', 
  requireAuth,
  requireRole(['ADMIN']),
  async (req, res) => {
    try {
      await dynamicPricing.updateDemandScores();

      res.json({
        success: true,
        message: 'Demand scores updated successfully'
      });
    } catch (error) {
      console.error('Error updating demand scores:', error);
      res.status(500).json({ error: 'Failed to update demand scores' });
    }
  }
);

module.exports = router;
