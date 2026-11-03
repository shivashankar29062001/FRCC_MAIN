/**
 * FRCC WhatsApp Service (Twilio WhatsApp Business API Integration)
 *
 * Sends automated membership confirmation details directly to the member's WhatsApp number.
 * Supports Twilio Content Templates (Meta WhatsApp approved templates) with automatic
 * rich-text fallback.
 */

const twilio = require('twilio');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const DEFAULT_SENDER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+917893616262';
const DEFAULT_CONTENT_SID = process.env.TWILIO_CONTENT_SID || 'HX4b311695df7bdd327691dfce64dbdcc6';
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

let twilioClient = null;
function getClient() {
  if (!twilioClient) {
    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      throw new Error('Twilio credentials missing: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
    }
    twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Normalizes phone number into E.164 with whatsapp: prefix.
 * Handles Indian 10-digit numbers, 91 prefix, +91 prefix, and international numbers.
 *
 * @param {string} phone
 * @returns {string} e.g. "whatsapp:+917893616262"
 */
function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('whatsapp:')) {
    return cleaned;
  }

  // If starts with +, strip + for digit check
  const digits = cleaned.replace(/\D/g, '');

  // Standard Indian 10 digit number
  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }

  // Indian number with 91 prefix (12 digits)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `whatsapp:+${digits}`;
  }

  // Number with leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return `whatsapp:+91${digits.slice(1)}`;
  }

  // Already prefixed with +
  if (cleaned.startsWith('+')) {
    return `whatsapp:${cleaned}`;
  }

  return `whatsapp:+${digits}`;
}

/**
 * Builds the rich-text membership confirmation message for WhatsApp.
 *
 * @param {object} details
 * @returns {string}
 */
function buildMembershipMessageText(details = {}) {
  const name = details.name || 'Esteemed Member';
  const memberId = details.memberId || 'FRCC-2026-PENDING';
  const planName = details.planName || 'FRCC Membership';
  const amountPaid = details.amountPaid != null ? Number(details.amountPaid).toLocaleString('en-IN') : '0';
  const validity = details.validity || 'Lifetime';
  const paymentId = details.paymentId || 'COMPLETED';

  return (
    `🎉 *Welcome to Film Recreation & Cultural Centre (FRCC)!*\n\n` +
    `Dear *${name}*,\n` +
    `Your FRCC Membership enrollment has been successfully confirmed. Welcome to the premier cultural & recreational fraternity!\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *MEMBERSHIP CONFIRMATION*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `• *Member ID:* ${memberId}\n` +
    `• *Membership Plan:* ${planName}\n` +
    `• *Validity:* ${validity}\n` +
    `• *Amount Paid:* ₹${amountPaid}\n` +
    `• *Payment Reference:* ${paymentId}\n` +
    `• *Status:* Active / Confirmed\n\n` +
    `✨ *YOUR EXCLUSIVE PRIVILEGES:*\n` +
    `✓ Official FRCC Membership ID Card activated\n` +
    `✓ FRCC Health Card: Up to 40% diagnostic & healthcare savings across our partner network\n` +
    `✓ 30% Privilege Discount on Venue Bookings, Suites & Dining\n` +
    `✓ Priority access to Sports, Recreation Zones, Swimming Pool & Cultural Conventions\n\n` +
    `📲 *ACCESS YOUR MEMBERSHIP & DIGITAL CARDS:*\n` +
    `https://www.frccind.com/membership/dashboard\n\n` +
    `For any assistance, contact our Membership Help Desk:\n` +
    `📞 +91 78936 16262 | ✉️ support@frccind.com\n\n` +
    `*Film Recreation & Cultural Centre (FRCC)*\n` +
    `_Vijayawada · Regd. No. 102 of 2026_`
  );
}

/**
 * Dispatches a WhatsApp confirmation to a member.
 *
 * @param {object} params
 * @param {string} params.mobile - Member's phone number
 * @param {string} params.name - Member full name
 * @param {string} params.memberId - Assigned FRCC member ID
 * @param {string} params.planName - Name of the purchased plan
 * @param {number|string} params.amountPaid - Amount paid
 * @param {string} [params.validity] - Plan validity (e.g. Lifetime)
 * @param {string} [params.paymentId] - Razorpay or order payment ID
 * @param {string} [params.contentSid] - Optional specific Twilio Content SID
 * @returns {Promise<object>} Status object
 */
async function sendMembershipConfirmation(params = {}) {
  const {
    mobile,
    name,
    memberId,
    planName,
    amountPaid,
    validity = 'Lifetime',
    paymentId = 'COMPLETED',
    contentSid = DEFAULT_CONTENT_SID,
  } = params;

  if (!mobile) {
    throw new Error('Mobile number is required to send WhatsApp confirmation');
  }

  const to = normalizeWhatsAppNumber(mobile);
  const from = DEFAULT_SENDER;
  const client = getClient();
  const formattedText = buildMembershipMessageText({
    name,
    memberId,
    planName,
    amountPaid,
    validity,
    paymentId,
  });

  console.info('[twilioWhatsApp] Sending confirmation to:', { to, from, memberId, planName });

  // 1. Try sending via approved Twilio Content Template if template SID exists
  if (contentSid) {
    try {
      const formattedAmount =
        amountPaid != null ? Number(amountPaid).toLocaleString('en-IN') : '0';

      const payload = {
        from,
        to,
        contentSid,
        contentVariables: JSON.stringify({
          '1': name || 'Member',
          '2': memberId || 'FRCC-2026',
          '3': planName || 'FRCC Membership',
          '4': formattedAmount,
          '5': validity || 'Lifetime',
          '6': paymentId || 'ONLINE',
        }),
      };

      if (MESSAGING_SERVICE_SID) {
        payload.messagingServiceSid = MESSAGING_SERVICE_SID;
      }

      const msg = await client.messages.create(payload);
      console.info('[twilioWhatsApp] Message sent via Content Template:', { sid: msg.sid, status: msg.status });
      return {
        success: true,
        method: 'content_template',
        messageSid: msg.sid,
        status: msg.status,
        to,
      };
    } catch (templateErr) {
      console.warn('[twilioWhatsApp] Content Template dispatch failed, falling back to direct body:', templateErr?.message);
    }
  }

  // 2. Direct body message dispatch (Fallback or when template is pending approval)
  try {
    const payload = {
      from,
      to,
      body: formattedText,
    };

    if (MESSAGING_SERVICE_SID) {
      payload.messagingServiceSid = MESSAGING_SERVICE_SID;
    }

    const msg = await client.messages.create(payload);
    console.info('[twilioWhatsApp] Message sent via direct body:', { sid: msg.sid, status: msg.status });
    return {
      success: true,
      method: 'direct_text',
      messageSid: msg.sid,
      status: msg.status,
      to,
    };
  } catch (err) {
    console.error('[twilioWhatsApp] Twilio message send error:', {
      code: err.code,
      status: err.status,
      message: err.message,
    });

    // Generate wa.me fallback link so member or admin can open WhatsApp immediately
    const cleanMobileDigits = to.replace(/\D/g, '');
    const fallbackWaUrl = `https://wa.me/${cleanMobileDigits}?text=${encodeURIComponent(formattedText)}`;

    return {
      success: false,
      code: err.code || null,
      status: err.status || 500,
      error: err.message || 'Failed to send WhatsApp message via Twilio',
      fallbackWaUrl,
      requiresTrustHubKyc: err.code === 20003,
      requiresSandboxJoin: err.code === 21608,
      to,
    };
  }
}

module.exports = {
  normalizeWhatsAppNumber,
  buildMembershipMessageText,
  sendMembershipConfirmation,
};
