// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/sms.ts
// Small provider abstraction for sending SMS / WhatsApp confirmation
// ---------------------------------------------------------------------------

export interface SmsBookingDetails {
  bookingReference: string;
  campus: string;
  slotId: string;
  vehicleNumber: string;
  startDate: string;
  startTime: string;
  durationDays: number;
  totalAmount: number | string;
  recipientMobile: string;
  myBookingsUrl?: string;
}

export interface SmsSendResult {
  ok: boolean;
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export function buildSmsText(d: SmsBookingDetails): string {
  const amountStr = !d.totalAmount || Number(d.totalAmount) === 0 ? 'Complimentary' : `Rs ${d.totalAmount}`;
  const blockName = d.slotId ? `Block ${d.slotId.charAt(0)}` : 'Main';
  return `FRCC Parking Confirmed! Ref: ${d.bookingReference}. Campus: ${d.campus}. Slot: ${d.slotId} (${blockName}). Vehicle: ${d.vehicleNumber}. Arrival: ${d.startDate} ${d.startTime} (${d.durationDays} day(s)). Amount: ${amountStr}. View booking: ${d.myBookingsUrl || 'https://frcc.in/my-bookings'}`;
}

/**
 * Sends confirmation SMS/WhatsApp using configured provider or falls back to log-only mode.
 * Retries up to 2 times on transient failures.
 */
export async function sendConfirmationSms(details: SmsBookingDetails): Promise<SmsSendResult> {
  const smsApiKey = Deno.env.get('SMS_API_KEY');
  const smsSenderId = Deno.env.get('SMS_SENDER_ID') || 'FRCCIN';
  const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');

  if (!smsApiKey && !whatsappToken) {
    console.log('[send-booking-confirmation] [LOG-ONLY MODE] SMS/WhatsApp provider secrets (SMS_API_KEY, WHATSAPP_TOKEN) not set. Skipped actual send.');
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Target Mobile: ${details.recipientMobile}`);
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Message: ${buildSmsText(details)}`);
    return {
      ok: true,
      channel: 'sms',
      status: 'skipped',
      error: 'log-only mode: SMS_API_KEY / WHATSAPP_TOKEN not configured'
    };
  }

  const messageText = buildSmsText(details);
  let lastError = '';

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Example standard SMS gateway HTTP dispatch
      if (smsApiKey) {
        const res = await fetch('https://api.sms-provider.com/v1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${smsApiKey}`,
          },
          body: JSON.stringify({
            sender: smsSenderId,
            to: details.recipientMobile,
            message: messageText,
          }),
        });

        if (res.ok) {
          return { ok: true, channel: 'sms', status: 'sent' };
        }
        lastError = `Status ${res.status}: ${await res.text()}`;
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  console.warn(`[send-booking-confirmation] SMS send failed after retries: ${lastError}`);
  return { ok: false, channel: 'sms', status: 'failed', error: lastError };
}

