// Initialize Stripe only if API key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
}

async function createPaymentIntent({ amount, currency = 'usd', metadata = {} }) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe expects cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
    return { success: true, clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
  } catch (err) {
    console.error('Stripe createPaymentIntent error:', err);
    return { success: false, error: err.message };
  }
}

async function confirmPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return { success: true, status: paymentIntent.status, paymentIntent };
  } catch (err) {
    console.error('Stripe confirmPaymentIntent error:', err);
    return { success: false, error: err.message };
  }
}

async function refundPayment({ paymentIntentId, amount, reason }) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? amount * 100 : undefined,
      reason: reason || 'requested_by_customer',
    });
    return { success: true, refund };
  } catch (err) {
    console.error('Stripe refund error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { createPaymentIntent, confirmPaymentIntent, refundPayment };
