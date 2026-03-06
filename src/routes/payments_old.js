const express = require('express');
const router = express.Router();
// const emailService = require('../emailService'); // Temporarily disabled

// Mock payment processing - replace with actual Stripe/Razorpay integration
router.post('/process', async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, cardDetails } = req.body;

    // Simulate payment processing
    const paymentResult = {
      id: `pay_${Date.now()}`,
      transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      status: Math.random() > 0.1 ? 'success' : 'failed',
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    if (paymentResult.status === 'success') {
      // Send payment confirmation email
      // await emailService.sendPaymentConfirmation({
      //   transactionId: paymentResult.transactionId,
      //   amount: paymentResult.amount,
      //   method: paymentMethod,
      //   userEmail: req.user?.email
      // });

      res.json({
        success: true,
        payment: paymentResult,
        message: 'Payment processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed. Please try again.'
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
});

router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    // Simulate refund processing
    const refundResult = {
      id: `ref_${Date.now()}`,
      paymentId,
      amount,
      status: 'success',
      reason,
      createdAt: new Date().toISOString()
    };

    res.json({
      success: true,
      refund: refundResult,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Refund processing failed'
    });
  }
});

router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Mock payment history
    const payments = [
      {
        id: 'pay_1',
        transactionId: 'txn_123456',
        amount: 2500,
        status: 'success',
        paymentMethod: 'Credit Card',
        hotelName: 'Grand Hotel',
        createdAt: '2024-01-15T10:30:00Z'
      }
    ];

    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

module.exports = router;
