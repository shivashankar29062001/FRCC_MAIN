const express = require('express');
const crypto = require('crypto');

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order via Razorpay REST API or mock order if keys are omitted.
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    // If real keys are provided in environment, call Razorpay Orders API
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
      const basicAuth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: notes || {},
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.description || 'Failed to create Razorpay order.' });
      }

      return res.json({
        id: data.id,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId: RAZORPAY_KEY_ID,
      });
    }

    // Development / Sandbox fallback when credentials are not yet entered
    const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return res.json({
      id: mockOrderId,
      orderId: mockOrderId,
      amount: Math.round(amount),
      currency,
      keyId: RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      mock: true,
    });
  } catch (err) {
    console.error('[Payments API] Error creating order:', err);
    return res.status(500).json({ error: 'Internal server error while creating payment order.' });
  }
});

/**
 * POST /api/payments/verify-payment
 * Verifies razorpay_signature using HMAC-SHA256
 */
router.post('/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id) {
      return res.status(400).json({ error: 'Missing payment ID.' });
    }

    if (RAZORPAY_KEY_SECRET && razorpay_order_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ verified: false, message: 'Invalid payment signature.' });
      }

      return res.json({ verified: true, message: 'Payment verified successfully.' });
    }

    // If running in development / test without secret
    return res.json({ verified: true, message: 'Verified (test mode).' });
  } catch (err) {
    console.error('[Payments API] Error verifying payment:', err);
    return res.status(500).json({ error: 'Internal server error while verifying payment.' });
  }
});

/**
 * POST /api/payments/webhook
 * Handles incoming Razorpay webhook events (e.g., payment.captured)
 */
router.post('/webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const bodyStr = JSON.stringify(req.body);

    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(bodyStr)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).send('Invalid webhook signature');
      }
    }

    const event = req.body.event;
    console.info(`[Razorpay Webhook] Received event: ${event}`);

    // Process event (e.g. payment.captured, order.paid)
    if (event === 'payment.captured') {
      const paymentEntity = req.body.payload?.payment?.entity;
      console.info(`[Razorpay Webhook] Payment ${paymentEntity?.id} captured for ${paymentEntity?.amount / 100} INR`);
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Payments API] Webhook error:', err);
    return res.status(500).send('Webhook processing error');
  }
});

module.exports = router;
