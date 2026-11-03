// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/whatsapp.ts
// WhatsApp provider abstraction for sending booking notifications
// ---------------------------------------------------------------------------

export interface WhatsAppNotificationDetails {
  recipientMobile: string;
  recipientName?: string;
  eventType: 'booking_confirmed' | 'booking_cancelled';
  serviceType: 'hall' | 'parking';
  bookingReference: string;
  title: string;
  date: string;
  time?: string;
  venueOrCampus: string;
  amount: number | string;
  refundAmount?: number | string;
  refundStatusText?: string;
  detailsUrl?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  channel: 'whatsapp';
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export function buildWhatsAppMessage(d: WhatsAppNotificationDetails): string {
  const isCancelled = d.eventType === 'booking_cancelled';
  if (isCancelled) {
    return (
      `*FRCC Booking Cancellation Notice*\n\n` +
      `Dear ${d.recipientName || 'Member'},\n` +
      `Your reservation for *${d.title}* at *${d.venueOrCampus}* on *${d.date}* has been cancelled.\n` +
      `Booking Ref: *${d.bookingReference}*\n` +
      (d.refundAmount ? `Refund: *Rs. ${d.refundAmount}* (${d.refundStatusText || 'Refund pending'})\n` : '') +
      `Refunds are credited to the original payment method as per your payment method timeline.\n\n` +
      `Details: ${d.detailsUrl || 'https://frcc.in/my-bookings'}\n` +
      `Film Recreation & Cultural Centre`
    );
  }

  return (
    `*FRCC Booking Confirmation*\n\n` +
    `Dear ${d.recipientName || 'Member'},\n` +
    `Your reservation for *${d.title}* at *${d.venueOrCampus}* is CONFIRMED!\n` +
    `Booking Ref: *${d.bookingReference}*\n` +
    `Date & Time: *${d.date} ${d.time || ''}*\n` +
    `Total: *Rs. ${d.amount}*\n\n` +
    `Manage booking: ${d.detailsUrl || 'https://frcc.in/my-bookings'}\n` +
    `Film Recreation & Cultural Centre`
  );
}

/**
 * Sends WhatsApp notification using Meta Cloud API or log-only fallback.
 */
export async function sendNotificationWhatsApp(details: WhatsAppNotificationDetails): Promise<WhatsAppSendResult> {
  const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
  const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

  if (!whatsappToken || !whatsappPhoneId) {
    console.log('[send-booking-confirmation] [LOG-ONLY MODE] WhatsApp secrets (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID) not set.');
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Recipient: ${details.recipientMobile}`);
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] WhatsApp Content:\n${buildWhatsAppMessage(details)}`);
    return {
      ok: true,
      channel: 'whatsapp',
      status: 'skipped',
      error: 'log-only mode: WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not configured',
    };
  }

  try {
    const rawNumber = details.recipientMobile.replace(/\D/g, '');
    const cleanNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

    const res = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanNumber,
        type: 'text',
        text: { body: buildWhatsAppMessage(details) },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.warn('[send-booking-confirmation] WhatsApp API error:', errData);
      return {
        ok: false,
        channel: 'whatsapp',
        status: 'failed',
        error: errData?.error?.message || 'WhatsApp message rejected',
      };
    }

    return {
      ok: true,
      channel: 'whatsapp',
      status: 'sent',
    };
  } catch (err: any) {
    console.warn('[send-booking-confirmation] WhatsApp network failure:', err);
    return {
      ok: false,
      channel: 'whatsapp',
      status: 'failed',
      error: err?.message || 'WhatsApp connection error',
    };
  }
}

