const express = require('express');
const { createPaymentIntent, confirmPaymentIntent, refundPayment } = require('../lib/stripe');
const { bookings, payments } = require('../data/store');
const { schemas, validate } = require('../lib/validate');

const router = express.Router();

// Create a payment intent for a booking
router.post('/intent', validate(schemas.payment.process), async (req, res) => {
  const { bookingId, amount } = req.validated;

  const booking = await bookings.findUnique({ where: { id: bookingId } });
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const result = await createPaymentIntent({
    amount,
    metadata: { bookingId },
  });

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  // Store payment record in PENDING state
  await payments.create({
    data: {
      bookingId,
      amount,
      status: 'PENDING',
      stripePaymentId: result.id,
    },
  });

  res.json({ clientSecret: result.clientSecret, paymentIntentId: result.id });
});

// Confirm a payment after client-side confirmation
router.post('/confirm', async (req, res) => {
  const { paymentIntentId } = req.body;
  if (!paymentIntentId) return res.status(400).json({ error: 'Missing paymentIntentId' });

  const result = await confirmPaymentIntent(paymentIntentId);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const payment = await payments.findFirst({ where: { stripePaymentId: paymentIntentId } });
  if (!payment) return res.status(404).json({ error: 'Payment record not found' });

  const updated = await payments.update({
    where: { id: payment.id },
    data: { status: result.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED' },
  });

  res.json({ status: updated.status, paymentId: updated.id });
});

// Refund a payment
router.post('/refund', validate(schemas.payment.refund), async (req, res) => {
  const { paymentId, amount, reason } = req.validated;

  const payment = await payments.findUnique({ where: { id: paymentId } });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.status !== 'SUCCEEDED') return res.status(400).json({ error: 'Only succeeded payments can be refunded' });

  const result = await refundPayment({
    paymentIntentId: payment.stripePaymentId,
    amount,
    reason,
  });

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  const updated = await payments.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      stripeRefundId: result.refund.id,
    },
  });

  res.json({ status: updated.status, refundId: updated.stripeRefundId });
});

// Get payment history for a user (via their bookings)
router.get('/history/me', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const userPayments = await payments.findMany({
    where: {
      booking: { userId },
    },
    include: {
      booking: {
        include: {
          hotel: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = userPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    method: p.method,
    hotelName: p.booking.hotel.name,
    createdAt: p.createdAt,
  }));

  res.json({ payments: mapped });
});

module.exports = router;
