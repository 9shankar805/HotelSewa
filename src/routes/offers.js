const express = require("express");
const { v4: uuid } = require("uuid");
const { requireAuth, requireRole } = require("../middleware/auth");
const { schemas, validate } = require("../lib/validate");

const router = express.Router();

// Get all offers for the authenticated hotel owner
router.get("/", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    
    const offers = await prisma.offer.findMany({
      where: {
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            usage: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: offers.map(offer => ({
        ...offer,
        applicableRoomTypes: offer.applicableRoomTypes ? JSON.parse(offer.applicableRoomTypes) : [],
        applicableDays: offer.applicableDays ? JSON.parse(offer.applicableDays) : [],
        currentUsage: offer.currentUsage || 0,
        maxUsage: offer.maxUsage,
      })),
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offers",
    });
  }
});

// Create a new offer
router.post("/", requireAuth, requireRole(["owner"]), validate(schemas.offer.create), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const offerData = req.validated;

    // Validate dates
    if (new Date(offerData.validTo) < new Date(offerData.validFrom)) {
      return res.status(400).json({
        success: false,
        message: "Valid to date must be after valid from date",
      });
    }

    // Validate discount
    if (offerData.discountType === "percentage" && offerData.discount > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    const offer = await prisma.offer.create({
      data: {
        id: uuid(),
        hotelId: req.user.hotelId,
        title: offerData.title,
        description: offerData.description,
        discount: offerData.discount,
        discountType: offerData.discountType,
        validFrom: offerData.validFrom,
        validTo: offerData.validTo,
        isActive: offerData.isActive || true,
        minStay: offerData.minStay || 1,
        maxDiscount: offerData.maxDiscount,
        applicableRoomTypes: offerData.applicableRoomTypes ? JSON.stringify(offerData.applicableRoomTypes) : null,
        applicableDays: offerData.applicableDays ? JSON.stringify(offerData.applicableDays) : null,
        maxUsage: offerData.maxUsage,
        currentUsage: 0,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...offer,
        applicableRoomTypes: offer.applicableRoomTypes ? JSON.parse(offer.applicableRoomTypes) : [],
        applicableDays: offer.applicableDays ? JSON.parse(offer.applicableDays) : [],
      },
      message: "Offer created successfully",
    });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create offer",
    });
  }
});

// Update an existing offer
router.put("/:id", requireAuth, requireRole(["owner"]), validate(schemas.offer.update), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;
    const offerData = req.validated;

    // Check if offer exists and belongs to the user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Validate dates
    if (offerData.validFrom && offerData.validTo && new Date(offerData.validTo) < new Date(offerData.validFrom)) {
      return res.status(400).json({
        success: false,
        message: "Valid to date must be after valid from date",
      });
    }

    // Validate discount
    if (offerData.discountType === "percentage" && offerData.discount > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        ...(offerData.title && { title: offerData.title }),
        ...(offerData.description && { description: offerData.description }),
        ...(offerData.discount && { discount: offerData.discount }),
        ...(offerData.discountType && { discountType: offerData.discountType }),
        ...(offerData.validFrom && { validFrom: offerData.validFrom }),
        ...(offerData.validTo && { validTo: offerData.validTo }),
        ...(offerData.isActive !== undefined && { isActive: offerData.isActive }),
        ...(offerData.minStay !== undefined && { minStay: offerData.minStay }),
        ...(offerData.maxDiscount !== undefined && { maxDiscount: offerData.maxDiscount }),
        ...(offerData.applicableRoomTypes !== undefined && { 
          applicableRoomTypes: JSON.stringify(offerData.applicableRoomTypes) 
        }),
        ...(offerData.applicableDays !== undefined && { 
          applicableDays: JSON.stringify(offerData.applicableDays) 
        }),
        ...(offerData.maxUsage !== undefined && { maxUsage: offerData.maxUsage }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        ...updatedOffer,
        applicableRoomTypes: updatedOffer.applicableRoomTypes ? JSON.parse(updatedOffer.applicableRoomTypes) : [],
        applicableDays: updatedOffer.applicableDays ? JSON.parse(updatedOffer.applicableDays) : [],
      },
      message: "Offer updated successfully",
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update offer",
    });
  }
});

// Delete an offer
router.delete("/:id", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    // Check if offer exists and belongs to the user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Soft delete
    await prisma.offer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete offer",
    });
  }
});

// Toggle offer status
router.patch("/:id/status", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if offer exists and belongs to the user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        ...updatedOffer,
        applicableRoomTypes: updatedOffer.applicableRoomTypes ? JSON.parse(updatedOffer.applicableRoomTypes) : [],
        applicableDays: updatedOffer.applicableDays ? JSON.parse(updatedOffer.applicableDays) : [],
      },
      message: "Offer status updated successfully",
    });
  } catch (error) {
    console.error("Error toggling offer status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update offer status",
    });
  }
});

// Get offer analytics
router.get("/:id/analytics", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const { id } = req.params;

    // Check if offer exists and belongs to the user
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id,
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Get analytics data
    const analytics = await prisma.offerAnalytics.findMany({
      where: {
        offerId: id,
      },
      orderBy: {
        date: "desc",
      },
      take: 30, // Last 30 days
    });

    const totalUses = analytics.reduce((sum, a) => sum + a.totalUses, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenueGenerated, 0);
    const avgConversionRate = analytics.length > 0 
      ? analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length 
      : 0;

    res.json({
      success: true,
      data: {
        totalUses,
        totalRevenue,
        avgConversionRate,
        dailyData: analytics.map(a => ({
          date: a.date,
          uses: a.totalUses,
          revenue: a.revenueGenerated,
          conversionRate: a.conversionRate,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching offer analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offer analytics",
    });
  }
});

// Validate offer
router.post("/validate", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");
    const offerData = req.body;

    const errors = [];

    // Title validation
    if (!offerData.title || offerData.title.trim().length === 0) {
      errors.push("Offer title is required");
    }

    // Description validation
    if (!offerData.description || offerData.description.trim().length === 0) {
      errors.push("Offer description is required");
    }

    // Discount validation
    if (!offerData.discount || offerData.discount <= 0) {
      errors.push("Discount must be greater than 0");
    }

    if (offerData.discountType === "percentage" && offerData.discount > 100) {
      errors.push("Percentage discount cannot exceed 100%");
    }

    // Date validation
    if (!offerData.validFrom || !offerData.validTo) {
      errors.push("Valid from and valid to dates are required");
    } else if (new Date(offerData.validTo) < new Date(offerData.validFrom)) {
      errors.push("Valid to date must be after valid from date");
    } else if (new Date(offerData.validFrom) < new Date().setHours(0, 0, 0, 0)) {
      errors.push("Valid from date cannot be in the past");
    }

    // Min stay validation
    if (!offerData.minStay || offerData.minStay < 1) {
      errors.push("Minimum stay must be at least 1 day");
    }

    // Max discount validation for percentage type
    if (offerData.discountType === "percentage" && 
        offerData.maxDiscount && 
        offerData.maxDiscount <= 0) {
      errors.push("Maximum discount must be greater than 0");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    res.json({
      success: true,
      message: "Offer is valid",
    });
  } catch (error) {
    console.error("Error validating offer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate offer",
    });
  }
});

// Get offer statistics
router.get("/stats", requireAuth, requireRole(["owner"]), async (req, res) => {
  try {
    const { prisma } = require("../lib/prisma");

    const stats = await prisma.offer.groupBy({
      by: {
        isActive: true,
      },
      where: {
        hotelId: req.user.hotelId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const totalOffers = stats.reduce((sum, s) => sum + s._count.id, 0);
    const activeOffers = stats.find(s => s.isActive)?._count.id || 0;
    const inactiveOffers = stats.find(s => !s.isActive)?._count.id || 0;

    // Get upcoming and expired offers
    const now = new Date();
    const upcomingOffers = await prisma.offer.count({
      where: {
        hotelId: req.user.hotelId,
        validFrom: {
          gt: now,
        },
        deletedAt: null,
      },
    });

    const expiredOffers = await prisma.offer.count({
      where: {
        hotelId: req.user.hotelId,
        validTo: {
          lt: now,
        },
        deletedAt: null,
      },
    });

    res.json({
      success: true,
      data: {
        totalOffers,
        activeOffers,
        inactiveOffers,
        upcomingOffers,
        expiredOffers,
      },
    });
  } catch (error) {
    console.error("Error fetching offer stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch offer statistics",
    });
  }
});

module.exports = router;
