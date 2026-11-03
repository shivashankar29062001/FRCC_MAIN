// All customer-facing notification wording lives here so it can be edited in one place.
// IMPORTANT: live SMS (MSG91/DLT) and WhatsApp (Meta) text must use provider-approved
// templates. The message bodies below are the rendered/plain-text versions; the provider
// template must contain the same variables and wording approved for your account.

const DEFAULT_POLICY_TEXT =
  'Cancel more than 48 hours before the event start for a 100% refund. ' +
  'Cancel within 48 hours of the event start for a 50% refund. ' +
  'No cancellation after the event has started.';

function safeText(value, max = 240) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function escapeHtml(value) {
  return safeText(value, 500)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function supportSuffix() {
  const phone = safeText(process.env.SUPPORT_PHONE, 40);
  return phone ? ` Support: ${phone}` : '';
}

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function bookingView(booking, policy = {}) {
  const hallName = safeText(booking.hallName, 80);
  const clubName = safeText(booking.venueName || booking.clubName, 80);
  const city = safeText(booking.cityName || booking.city, 60);
  const location = [hallName, clubName, city].filter(Boolean).join(', ');
  return {
    id: safeText(booking.id, 40),
    hallName,
    clubName,
    city,
    location,
    date: safeText(booking.date, 20),
    startTime: safeText(booking.startTime, 10),
    endTime: safeText(booking.endTime, 10),
    guests: safeText(booking.guests, 12),
    organizerName: safeText(booking.organizerName, 100),
    phone: safeText(booking.phone, 30),
    email: safeText(booking.email, 120),
    amount: formatAmount(booking.amount),
    amountPaid: formatAmount(booking.amountPaid ?? 0),
    balanceDue: formatAmount(booking.balanceDue ?? 0),
    paymentMethod: safeText((booking.paymentMethod || 'UPI_ID').replaceAll('_', ' '), 60),
    maskedInstrument: safeText(booking.maskedInstrument || booking.upiIdMasked, 80),
    paymentStatus: safeText(booking.paymentStatus, 40),
    status: safeText(booking.status, 40),
    refundPercent: Number(policy.refundPercent ?? booking.refundPercent ?? 0),
    refundAmount: formatAmount(policy.refundAmount ?? booking.refundAmount ?? 0),
    refundMethod: safeText(
      policy.refundMethod || booking.refundMethod || 'your original payment method',
      140
    ),
    policyText: safeText(policy.policyText || DEFAULT_POLICY_TEXT, 400),
  };
}

function buildBookingMessages(booking, type, policy = {}) {
  const v = bookingView(booking, policy);
  const support = supportSuffix();
  const policyText = v.policyText;
  const balanceLine = Number(booking.balanceDue || 0) > 0
    ? `, Balance due Rs ${v.balanceDue}`
    : '';

  const confirmedSms =
    `FRCC CONVENTIONS: Booking confirmed. ID ${v.id}. ${v.location}. ` +
    `${v.date} ${v.startTime}-${v.endTime}. Guests: ${v.guests}. ` +
    `Paid: Rs ${v.amountPaid}${balanceLine}. ` +
    `Cancel 48h+ before: 100% refund; within 48h: 50% refund.${support}`;

  const cancelledSms =
    `FRCC CONVENTIONS: Booking ${v.id} cancelled. ${v.hallName}, ${v.clubName}, ${v.date}. ` +
    `Refund Rs ${v.refundAmount} (${v.refundPercent}%) to your original payment method, ` +
    `status: initiated.${support}`;

  const pendingSms =
    `FRCC CONVENTIONS: Booking ${v.id} received. Payment verification pending. ` +
    'We will confirm shortly.';

  const emailDetails = [
    ['Booking ID', v.id],
    ['Hall', v.hallName],
    ['Club', v.clubName],
    ['City', v.city],
    ['Date', v.date],
    ['Time', `${v.startTime} - ${v.endTime}`],
    ['Guests', v.guests],
    ['Amount paid', `Rs ${v.amountPaid}`],
    ['Balance due', `Rs ${v.balanceDue}`],
    ['Payment method', v.paymentMethod],
    ['Instrument', v.maskedInstrument || '—'],
  ];

  if (type === 'CANCELLED') {
    emailDetails.push(
      ['Refund', `Rs ${v.refundAmount} (${v.refundPercent}%)`],
      ['Refund method', v.refundMethod],
      ['Refund status', 'Initiated']
    );
  }

  const title = type === 'CONFIRMED'
    ? `Booking confirmed - ${v.id}`
    : type === 'CANCELLED'
      ? `Booking cancelled - ${v.id}`
      : `Booking received - ${v.id}`;

  const intro = type === 'CONFIRMED'
    ? 'Your booking is confirmed.'
    : type === 'CANCELLED'
      ? 'Your booking has been cancelled.'
      : 'Booking received, payment verification pending.';

  const rows = emailDetails
    .map(([label, value]) => `<tr><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;color:#0f1f3d;font-weight:600;">${escapeHtml(value)}</td></tr>`)
    .join('');

  const textLines = [
    'FRCC CONVENTIONS',
    intro,
    '',
    `Booking ID: ${v.id}`,
    `Hall: ${v.hallName}`,
    `Club: ${v.clubName}`,
    `City: ${v.city}`,
    `Date: ${v.date}`,
    `Time: ${v.startTime} - ${v.endTime}`,
    `Guests: ${v.guests}`,
    `Amount paid: Rs ${v.amountPaid}`,
    `Balance due: Rs ${v.balanceDue}`,
    `Payment method: ${v.paymentMethod}`,
    `Instrument: ${v.maskedInstrument || '—'}`,
  ];
  if (type === 'CANCELLED') {
    textLines.push(
      `Refund: Rs ${v.refundAmount} (${v.refundPercent}%)`,
      `Refund method: ${v.refundMethod}`,
      'Refund status: Initiated'
    );
  }
  textLines.push('', `Cancellation policy: ${policyText}`, '', `View My Bookings: ${appUrl()}/my-bookings`);
  if (process.env.SUPPORT_PHONE) textLines.push(`Support: ${safeText(process.env.SUPPORT_PHONE, 40)}`);

  const emailHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1e9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:#1a1a5e;padding:22px 28px;border-bottom:4px solid #c9a227;">
      <div style="color:#c9a227;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:bold;letter-spacing:.5px;">FRCC CONVENTIONS</div>
      <div style="color:#b9b9c9;font-size:11px;margin-top:4px;">Film Recreation &amp; Cultural Centre</div>
    </div>
    <div style="padding:26px 28px;">
      <h1 style="margin:0 0 8px;color:#0f1f3d;font-family:Georgia,'Times New Roman',serif;font-size:22px;">${escapeHtml(intro)}</h1>
      <p style="margin:0 0 18px;color:#6b7280;font-size:14px;">${escapeHtml(title)}</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;background:#fcfbf7;border:1px solid #ece7d7;">${rows}</table>
      ${type === 'CANCELLED' ? `<p style="margin:16px 0 0;padding:12px 14px;background:#fff8e6;border-left:3px solid #c9a227;color:#5b4a12;font-size:13px;"><strong>Refund:</strong> Rs ${escapeHtml(v.refundAmount)} (${escapeHtml(v.refundPercent)}%)<br><strong>Method:</strong> ${escapeHtml(v.refundMethod)}<br><strong>Status:</strong> Initiated</p>` : ''}
      <p style="margin:18px 0 0;color:#4b5563;font-size:13px;line-height:1.6;"><strong style="color:#0f1f3d;">Cancellation policy:</strong> ${escapeHtml(policyText)}</p>
      <p style="margin:22px 0 0;"><a href="${escapeHtml(appUrl())}/my-bookings" style="display:inline-block;background:#1a1a5e;color:#c9a227;text-decoration:none;padding:11px 22px;border-radius:4px;font-weight:bold;font-size:14px;">View My Bookings</a></p>
    </div>
    <div style="padding:16px 28px;background:#f4f1e9;color:#6b7280;font-size:11px;">This is an automated message from FRCC CONVENTIONS.${process.env.SUPPORT_PHONE ? ` Support: ${escapeHtml(process.env.SUPPORT_PHONE)}` : ''}</div>
  </div>
</body></html>`;

  return {
    sms: type === 'CONFIRMED' ? confirmedSms : type === 'CANCELLED' ? cancelledSms : pendingSms,
    whatsapp: type === 'CONFIRMED' ? confirmedSms : type === 'CANCELLED' ? cancelledSms : pendingSms,
    email: {
      subject: title,
      text: textLines.join('\n'),
      html: emailHtml,
    },
  };
}

module.exports = { buildBookingMessages };

