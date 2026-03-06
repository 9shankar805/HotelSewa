const Joi = require('joi');

const schemas = {
  auth: {
    register: Joi.object({
      role: Joi.string().valid('ADMIN', 'OWNER', 'CUSTOMER').required(),
      name: Joi.string().min(1).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(100).required(),
    }),
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
    google: Joi.object({
      credential: Joi.string().required(),
      role: Joi.string().valid('OWNER', 'CUSTOMER').default('CUSTOMER'),
    }),
  },

  hotel: {
    create: Joi.object({
      name: Joi.string().min(1).max(200).required(),
      location: Joi.string().min(1).max(200).required(),
      address: Joi.string().max(400).optional(),
      amenities: Joi.array().items(Joi.string()).optional(),
      description: Joi.string().max(2000).optional(),
    }),
    createRoom: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      pricePerNight: Joi.number().integer().min(0).required(),
      capacity: Joi.number().integer().min(1).max(10).optional(),
      inventory: Joi.number().integer().min(0).optional(),
    }),
    review: Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().max(1000).optional(),
    }),
  },

  offer: {
    create: Joi.object({
      title: Joi.string().min(1).max(255).required(),
      description: Joi.string().min(1).max(2000).required(),
      discount: Joi.number().min(0).required(),
      discountType: Joi.string().valid('percentage', 'fixed').required(),
      validFrom: Joi.date().iso().required(),
      validTo: Joi.date().iso().required(),
      isActive: Joi.boolean().default(true),
      minStay: Joi.number().integer().min(1).default(1),
      maxDiscount: Joi.number().min(0).optional(),
      applicableRoomTypes: Joi.array().items(Joi.string()).optional(),
      applicableDays: Joi.array().items(Joi.string()).optional(),
      maxUsage: Joi.number().integer().min(0).optional(),
    }),
    update: Joi.object({
      title: Joi.string().min(1).max(255).optional(),
      description: Joi.string().min(1).max(2000).optional(),
      discount: Joi.number().min(0).optional(),
      discountType: Joi.string().valid('percentage', 'fixed').optional(),
      validFrom: Joi.date().iso().optional(),
      validTo: Joi.date().iso().optional(),
      isActive: Joi.boolean().optional(),
      minStay: Joi.number().integer().min(1).optional(),
      maxDiscount: Joi.number().min(0).optional(),
      applicableRoomTypes: Joi.array().items(Joi.string()).optional(),
      applicableDays: Joi.array().items(Joi.string()).optional(),
      maxUsage: Joi.number().integer().min(0).optional(),
    }),
  },

  calendar: {
    blockDates: Joi.object({
      dates: Joi.array().items(Joi.date().iso()).required(),
      isBlocked: Joi.boolean().required(),
      reason: Joi.string().max(500).optional(),
    }),
    updateAvailability: Joi.object({
      date: Joi.date().iso().required(),
      isAvailable: Joi.boolean().required(),
    }),
    updatePricing: Joi.object({
      date: Joi.date().iso().required(),
      roomPrices: Joi.object().required(),
    }),
  },

  chat: {
    createConversation: Joi.object({
      participantId: Joi.string().required(),
      participantName: Joi.string().min(1).max(255).required(),
      participantType: Joi.string().valid('guest', 'admin', 'support', 'owner').required(),
      participantAvatar: Joi.string().uri().optional(),
    }),
    sendMessage: Joi.object({
      content: Joi.string().min(1).max(2000).required(),
      type: Joi.string().valid('text', 'image', 'file', 'system').default('text'),
    }),
    updateOnlineStatus: Joi.object({
      isOnline: Joi.boolean().required(),
    }),
  },

  booking: {
    create: Joi.object({
      hotelId: Joi.string().uuid().required(),
      roomId: Joi.string().uuid().required(),
      checkIn: Joi.date().iso().required(),
      checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required(),
      guests: Joi.number().integer().min(1).max(10).optional(),
    }),
  },

  payment: {
    process: Joi.object({
      bookingId: Joi.string().uuid().required(),
      amount: Joi.number().integer().min(0).required(),
      paymentMethod: Joi.string().required(),
      cardDetails: Joi.object({
        number: Joi.string().required(),
        expMonth: Joi.number().integer().min(1).max(12).required(),
        expYear: Joi.number().integer().min(new Date().getFullYear()).required(),
        cvc: Joi.string().required(),
      }).optional(),
    }),
    refund: Joi.object({
      paymentId: Joi.string().uuid().required(),
      amount: Joi.number().integer().min(0).optional(),
      reason: Joi.string().max(500).optional(),
    }),
  },
};

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    req.validated = value;
    next();
  };
}

module.exports = { schemas, validate };
