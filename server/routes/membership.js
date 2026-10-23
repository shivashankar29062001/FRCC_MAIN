const express = require('express');
const router = express.Router();
const { sendMembershipConfirmation } = require('../services/twilioWhatsApp');

/**
 * POST /api/membership/send-whatsapp
 * Sends membership confirmation details to the member's WhatsApp number.
 */
router.post('/send-whatsapp', async (req, res) => {
  try {
    const {
      mobile,
      name,
      memberId,
      planName,
      amountPaid,
      validity,
      paymentId,
      contentSid,
    } = req.body || {};

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: 'Field "mobile" is required to send WhatsApp confirmation',
      });
    }

    const result = await sendMembershipConfirmation({
      mobile,
      name,
      memberId,
      planName,
      amountPaid,
      validity,
      paymentId,
      contentSid,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: 'WhatsApp confirmation sent successfully',
        data: result,
      });
    }

    // Twilio returned an error (e.g. KYC profile pending or sandbox)
    // Return 200 with success: false and the fallback URL so frontend can handle gracefully
    return res.status(200).json({
      success: false,
      error: result.error,
      code: result.code,
      fallbackWaUrl: result.fallbackWaUrl,
      requiresTrustHubKyc: result.requiresTrustHubKyc,
      to: result.to,
      message: result.requiresTrustHubKyc
        ? 'Twilio Primary Customer Profile (KYC) in Trust Hub needs approval. Fallback WhatsApp link generated.'
        : result.error,
    });
  } catch (err) {
    console.error('[routes/membership] Error handling WhatsApp send:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while sending WhatsApp message',
    });
  }
});

module.exports = router;
