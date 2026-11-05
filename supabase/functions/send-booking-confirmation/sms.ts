// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/sms.ts
// Small provider abstraction for sending SMS booking notifications
// ---------------------------------------------------------------------------

export interface SmsNotificationDetails {
  serviceType: 'hall' | 'parking';
  eventType: 'booking_confirmed' | 'booking_cancelled';
  bookingReference: string;
  title: string;
  campus: string;
  date: string;
  time?: string;
  totalAmount: number | string;
  refundAmount?: number | string;
  recipientMobile: string;
  myBookingsUrl?: string;
}

export interface SmsSendResult {
  ok: boolean;
  channel: 'sms';
  status: 'sent' | 'skipped' | 'failed';
  error?: string;
}

export function buildSmsText(d: SmsNotificationDetails): string {
  if (d.eventType === 'booking_cancelled') {
    const refundStr = d.refundAmount ? ` Refund of Rs ${d.refundAmount} initiated.` : '';
    return `FRCC Notice: Your reservation for ${d.title} at ${d.campus} on ${d.date} has been CANCELLED (Ref: ${d.bookingReference}).${refundStr} Info: ${d.myBookingsUrl || 'https://frcc.in/my-bookings'}`;
  }

  const amountStr = !d.totalAmount || Number(d.totalAmount) === 0 ? 'Complimentary' : `Rs ${d.totalAmount}`;
  return `FRCC Confirmed! Ref: ${d.bookingReference}. ${d.title} at ${d.campus}. Date: ${d.date} ${d.time || ''}. Amount: ${amountStr}. View details: ${d.myBookingsUrl || 'https://frcc.in/my-bookings'}`;
}

/**
 * Sends notification SMS using configured provider or falls back to log-only mode.
 */
export async function sendNotificationSms(details: SmsNotificationDetails): Promise<SmsSendResult> {
  const smsApiKey = Deno.env.get('SMS_API_KEY');
  const smsSenderId = Deno.env.get('SMS_SENDER_ID') || 'FRCCIN';

  if (!smsApiKey) {
    console.log('[send-booking-confirmation] [LOG-ONLY MODE] SMS provider secret (SMS_API_KEY) not set. Skipped actual send.');
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] Target Mobile: ${details.recipientMobile}`);
    console.log(`[send-booking-confirmation] [LOG-ONLY MODE] SMS: ${buildSmsText(details)}`);
    return {
      ok: true,
      channel: 'sms',
      status: 'skipped',
      error: 'log-only mode: SMS_API_KEY not configured',
    };
  }

  try {
    const rawNumber = details.recipientMobile.replace(/\D/g, '');
    const cleanNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

    const res = await fetch('https://api.textlocal.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        apikey: smsApiKey,
        numbers: cleanNumber,
        message: buildSmsText(details),
        sender: smsSenderId,
      }),
    });

    const resData = await res.json().catch(() => null);
    if (!res.ok || resData?.status === 'failure') {
      return {
        ok: false,
        channel: 'sms',
        status: 'failed',
        error: resData?.errors?.[0]?.message || 'SMS provider rejected send',
      };
    }

    return { ok: true, channel: 'sms', status: 'sent' };
  } catch (err: any) {
    return {
      ok: false,
      channel: 'sms',
      status: 'failed',
      error: err?.message || 'SMS connection error',
    };
  }
}
