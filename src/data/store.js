const prisma = require('../lib/prisma');

module.exports = {
  users: prisma.user,
  hotels: prisma.hotel,
  rooms: prisma.room,
  bookings: prisma.booking,
  reviews: prisma.review,
  payments: prisma.payment,
  wallets: prisma.wallet,
  payouts: prisma.payout,
  loyaltyMemberships: prisma.loyaltyMembership,
  loyaltyRewards: prisma.loyaltyReward,
  pricingRules: prisma.pricingRule,
  dynamicPrices: prisma.dynamicPrice,
  seasonalDemands: prisma.seasonalDemand,
  eventDemands: prisma.eventDemand,
};
