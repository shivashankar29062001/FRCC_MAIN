// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/email.ts
// Small provider abstraction for sending HTML confirmation & cancellation emails
// ---------------------------------------------------------------------------

export interface EmailNotificationDetails {
  serviceType: 'hall' | 'parking';
  eventType: 'booking_confirmed' | 'booking_cancelled';
  bookingReference: string;
  title: string; // e.g. "Board Room (AC)" or "Parking Slot A01"
  campus: string;
  date: string;
  time?: string;
  duration?: string;
  guests?: number;
  totalAmount: number | string;
  refundAmount?: number | string;
  refundStatusText?: string;
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

export function buildEmailHtml(d: EmailNotificationDetails): string {
  const isCancelled = d.eventType === 'booking_cancelled';
  const headerSubtitle = isCancelled
    ? `${d.serviceType === 'hall' ? 'Convention Hall' : 'Parking'} Cancellation Notice`
    : `${d.serviceType === 'hall' ? 'Convention Hall' : 'Parking'} Reservation Confirmation`;

  const headingText = isCancelled
    ? `Booking Cancellation Confirmation`
    : `Your Reservation is Confirmed!`;

  const amountDisplay = !d.totalAmount || Number(d.totalAmount) === 0 ? 'Complimentary / Free' : `₹${Number(d.totalAmount).toLocaleString('en-IN')}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FRCC Booking Notification</title>
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
              <p style="margin: 4px 0 0 0; color: #F8F6EF; font-size: 13px; opacity: 0.85;">${headerSubtitle}</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 12px 0; color: #0B1833; font-size: 18px;">${headingText}</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Hello ${d.recipientName || 'Member'}, ${isCancelled
                  ? `your reservation for <strong>${d.title}</strong> has been cancelled.`
                  : `your reservation for <strong>${d.title}</strong> is confirmed. Please keep this reference for your visit.`}
              </p>

              <!-- Reference Badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FEF9EE; border: 1px dashed #D6A72F; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748B; letter-spacing: 1px; font-weight: 600;">Booking Reference</div>
                    <div style="font-size: 24px; font-weight: 800; color: #0B1833; letter-spacing: 2px; margin-top: 4px;">${d.bookingReference}</div>
                  </td>
                </tr>
              </table>

              <!-- Details Table -->
              <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; border-collapse: collapse; margin-bottom: 24px;">
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B; width: 40%;">Service / Venue</td>
                  <td style="color: #0B1833; font-weight: 600;">${d.title} &bull; ${d.campus}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B;">Date</td>
                  <td style="color: #0B1833; font-weight: 600;">${d.date}</td>
                </tr>
                ${d.time ? `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B;">Time</td>
                  <td style="color: #0B1833; font-weight: 600;">${d.time}</td>
                </tr>` : ''}
                ${d.guests ? `
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B;">Guests</td>
                  <td style="color: #0B1833; font-weight: 600;">${d.guests.toLocaleString('en-IN')}</td>
                </tr>` : ''}
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="color: #64748B;">Amount</td>
                  <td style="color: #0B1833; font-weight: 600;">${amountDisplay}</td>
                </tr>
                ${isCancelled && d.refundAmount != null ? `
                <tr style="border-bottom: 1px solid #F1F5F9; background-color: #F0FDF4;">
                  <td style="color: #166534; font-weight: 600;">Refund Status</td>
                  <td style="color: #166534; font-weight: 700;">₹${Number(d.refundAmount).toLocaleString('en-IN')} (${d.refundStatusText || 'Refund pending'})</td>
                </tr>` : ''}
              </table>

              ${isCancelled ? `
              <p style="font-size: 13px; color: #64748B; margin-top: 10px;">
                Refunds are credited to the original payment method as per your payment method timeline.
              </p>` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${d.myBookingsUrl || 'https://frcc.in/my-bookings'}" style="display: inline-block; background-color: #0B1833; color: #D6A72F; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 8px rgba(11, 24, 51, 0.2);">
                  View in My Bookings &rarr;
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F9FA; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB; font-size: 12px; color: #94A3B8;">
              <p style="margin: 0 0 6px 0;">Film Recreation &amp; Cultural Centre &bull; Hyderabad &bull; Vijayawada</p>
              <p style="margin: 0;">24/7 Member Desk: +91 78936 16262 &bull; support@frcc.club</p>
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
 * Sends notification email via Resend or log-only mode.
 */
export async function sendNotificationEmail(details: EmailNotificationDetails): Promise<SendResult> {
  const emailApiKey = Deno.env.get('EMAIL_API_KEY') || Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM') || 'FRCC Bookings <bookings@frcc.club>';

  if (!emailApiKey) {
    console.log('[send-booking-confirmation] [LOG-ONLY MODE] Email provider key (EMAIL_API_KEY / RESEND_API_KEY) not set. Skipped actual send.');
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Target Email: ${details.recipientEmail}`);
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Reference: ${details.bookingReference}, Title: ${details.title}`);
    return {
      ok: true,
      channel: 'email',
      status: 'skipped',
      error: 'log-only mode: EMAIL_API_KEY not configured',
    };
  }

  let attempt = 0;
  let lastError = '';

  while (attempt < 2) {
    attempt++;
    try {
      const subject = details.eventType === 'booking_cancelled'
        ? `Booking Cancelled: ${details.title} [${details.bookingReference}]`
        : `Booking Confirmed: ${details.title} [${details.bookingReference}]`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: details.recipientEmail,
          subject,
          html: buildEmailHtml(details),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        lastError = `Status ${res.status}: ${errorText}`;
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          break;
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }

      return { ok: true, channel: 'email', status: 'sent' };
    } catch (err: any) {
      lastError = err?.message || String(err);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  console.warn(`[send-booking-confirmation] Email send failed after retries: ${lastError}`);
  return { ok: false, channel: 'email', status: 'failed', error: lastError };
}
