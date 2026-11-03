// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/email.ts
// Small provider abstraction for sending HTML confirmation emails
// ---------------------------------------------------------------------------

export interface EmailBookingDetails {
  bookingReference: string;
  campus: string;
  slotId: string;
  vehicleNumber: string;
  startDate: string;
  startTime: string;
  durationDays: number;
  totalAmount: number | string;
  recipientEmail: string;
  recipientName?: string;
  myBookingsUrl?: string;
}

export interface SendResult {
  ok: boolean;
  channel: 'email';
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export function buildEmailHtml(d: EmailBookingDetails): string {
  const amountDisplay = !d.totalAmount || Number(d.totalAmount) === 0 ? 'Complimentary / Free' : `₹${d.totalAmount}`;
  const blockName = d.slotId ? `Block ${d.slotId.charAt(0)}` : 'Main Block';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FRCC Parking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F6EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0B1833;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F6EF; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(11, 24, 51, 0.08); border: 1px solid #E5E7EB;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0B1833; padding: 24px 30px; text-align: center;">
              <h1 style="margin: 0; color: #D6A72F; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">FILM RECREATION &amp; CULTURAL CENTRE</h1>
              <p style="margin: 4px 0 0 0; color: #F8F6EF; font-size: 13px; opacity: 0.85;">Parking Reservation Confirmation</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 12px 0; color: #0B1833; font-size: 18px;">Your Parking Slot is Reserved!</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello ${d.recipientName || 'Member'}, your parking spot has been secured. Please display this booking confirmation reference or your member badge at the campus entrance boom barrier.
              </p>

              <!-- Reference Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF9EE; border: 1px dashed #D6A72F; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <span style="display: block; font-size: 11px; text-transform: uppercase; color: #8A6D1F; font-weight: 600; letter-spacing: 1px;">Booking Reference ID</span>
                    <span style="display: block; font-size: 20px; font-weight: 700; color: #0B1833; font-family: monospace; margin-top: 4px;">${d.bookingReference}</span>
                  </td>
                </tr>
              </table>

              <!-- Booking Details Table -->
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 13px; border-collapse: collapse; margin-bottom: 24px;">
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; padding: 10px 0;">Campus Location:</td>
                  <td style="color: #0B1833; font-weight: 600; text-align: right; padding: 10px 0;">${d.campus}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; padding: 10px 0;">Slot &amp; Block:</td>
                  <td style="color: #0B1833; font-weight: 600; text-align: right; padding: 10px 0;">Slot ${d.slotId} (${blockName})</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; padding: 10px 0;">Vehicle Number:</td>
                  <td style="color: #0B1833; font-weight: 600; text-align: right; font-family: monospace; padding: 10px 0;">${d.vehicleNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; padding: 10px 0;">Arrival Date &amp; Time:</td>
                  <td style="color: #0B1833; font-weight: 600; text-align: right; padding: 10px 0;">${d.startDate} at ${d.startTime}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; padding: 10px 0;">Duration:</td>
                  <td style="color: #0B1833; font-weight: 600; text-align: right; padding: 10px 0;">${d.durationDays} Day${d.durationDays > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 10px 0;">Total Amount:</td>
                  <td style="color: #0B1833; font-weight: 700; text-align: right; color: #0B1833; padding: 10px 0;">${amountDisplay}</td>
                </tr>
              </table>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 10px;">
                <tr>
                  <td align="center">
                    <a href="${d.myBookingsUrl || 'https://frcc.in/my-bookings'}" style="display: inline-block; background-color: #0B1833; color: #D6A72F; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; border: 1px solid #D6A72F;">View in My Bookings</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px 30px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
              Film Recreation &amp; Cultural Centre &bull; Andhra Pradesh &amp; Telangana &bull; Helpline: +91 78936 16262
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends confirmation email using configured provider or falls back to log-only mode.
 * Retries up to 2 times on transient failures.
 */
export async function sendConfirmationEmail(details: EmailBookingDetails): Promise<SendResult> {
  const apiKey = Deno.env.get('EMAIL_API_KEY');
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'noreply@frcc.in';

  if (!apiKey || !apiKey.trim()) {
    console.log('[send-booking-confirmation] [LOG-ONLY MODE] Email provider key (EMAIL_API_KEY) not set. Skipped actual send.');
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Target Email: ${details.recipientEmail}`);
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Reference: ${details.bookingReference}, Slot: ${details.slotId}, Campus: ${details.campus}`);
    return {
      ok: true,
      channel: 'email',
      status: 'skipped',
      error: 'log-only mode: EMAIL_API_KEY not configured'
    };
  }

  const htmlContent = buildEmailHtml(details);

  // Up to 2 retries on provider failure
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Standard HTTP email delivery (e.g. Resend endpoint)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: details.recipientEmail,
          subject: `FRCC Parking Confirmed: ${details.slotId} (${details.bookingReference})`,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        return { ok: true, channel: 'email', status: 'sent' };
      }
      lastError = `Status ${res.status}: ${await res.text()}`;
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  console.warn(`[send-booking-confirmation] Email send failed after retries: ${lastError}`);
  return { ok: false, channel: 'email', status: 'failed', error: lastError };
}

