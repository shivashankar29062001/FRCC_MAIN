// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/index.ts
// Supabase Edge Function to deliver parking booking confirmations to the
// user's registered email and mobile via provider abstraction.
// Runs server-side with service role; safe idempotent execution.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { sendConfirmationEmail } from './email.ts';
import { sendConfirmationSms } from './sms.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { booking_id, is_resend = false } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch booking record with service role
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('parking_bookings')
      .select('*')
      .or(`id.eq.${booking_id},booking_reference.eq.${booking_id}`)
      .maybeSingle();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found', details: bookingErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read user's registered email & mobile from profiles or auth
    let registeredEmail = '';
    let registeredMobile = '';
    let registeredName = '';

    if (booking.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, phone, mobile, full_name, name')
        .eq('id', booking.user_id)
        .maybeSingle();

      if (profile) {
        registeredEmail = profile.email || '';
        registeredMobile = profile.phone || profile.mobile || '';
        registeredName = profile.full_name || profile.name || '';
      }

      // Check auth.users if email was not found in profile
      if (!registeredEmail || !registeredMobile) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
        if (authUser?.user) {
          registeredEmail = registeredEmail || authUser.user.email || '';
          registeredMobile = registeredMobile || authUser.user.phone || authUser.user.user_metadata?.phone || '';
          registeredName = registeredName || authUser.user.user_metadata?.full_name || '';
        }
      }
    }

    // Fallbacks from booking if user profile lacked contact
    registeredEmail = registeredEmail || booking.email || '';
    registeredMobile = registeredMobile || booking.mobile || booking.phone || '';

    // 3. Check rate limiting for resends (max 3 resends per booking)
    if (is_resend) {
      const { count } = await supabaseAdmin
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', booking.booking_reference || booking.id)
        .eq('channel', 'email');

      if (count && count >= 3) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Maximum of 3 confirmation resends per booking reached.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Idempotency check: if not a resend and already sent, return existing status
    if (!is_resend) {
      const { data: existingSend } = await supabaseAdmin
        .from('notification_log')
        .select('id, channel, status')
        .eq('booking_id', booking.booking_reference || booking.id)
        .eq('status', 'sent');

      if (existingSend && existingSend.length > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            message: 'Confirmation already delivered for this booking.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const campusDisplay = booking.campus
      ? (booking.campus.toLowerCase().includes('hyd') ? 'Hyderabad Campus' : 'Vijayawada Campus')
      : (booking.city ? `${booking.city} Campus` : 'Vijayawada Campus');

    const commonDetails = {
      bookingReference: booking.booking_reference || String(booking.id),
      campus: campusDisplay,
      slotId: booking.slot_id || 'A01',
      vehicleNumber: booking.vehicle_number || '',
      startDate: booking.booking_date || '',
      startTime: booking.arrival_time || '',
      durationDays: Number(booking.duration_days) || 1,
      totalAmount: booking.total_amount ?? 0,
      myBookingsUrl: 'https://frcc.in/my-bookings',
    };

    // 5. Send confirmation email
    const emailResult = registeredEmail
      ? await sendConfirmationEmail({
          ...commonDetails,
          recipientEmail: registeredEmail,
          recipientName: registeredName,
        })
      : { ok: true, channel: 'email' as const, status: 'skipped' as const, error: 'No registered email found' };

    // Record in notification_log
    await supabaseAdmin.from('notification_log').insert({
      booking_id: booking.booking_reference || booking.id,
      service_type: 'parking',
      channel: 'email',
      recipient: registeredEmail || 'none',
      status: emailResult.status,
      retry_count: emailResult.ok ? 0 : 2,
      error_message: emailResult.error || null,
      sent_at: new Date().toISOString(),
    });

    // 6. Send confirmation SMS
    const smsResult = registeredMobile
      ? await sendConfirmationSms({
          ...commonDetails,
          recipientMobile: registeredMobile,
        })
      : { ok: true, channel: 'sms' as const, status: 'skipped' as const, error: 'No registered mobile found' };

    // Record in notification_log
    await supabaseAdmin.from('notification_log').insert({
      booking_id: booking.booking_reference || booking.id,
      service_type: 'parking',
      channel: 'sms',
      recipient: registeredMobile || 'none',
      status: smsResult.status,
      retry_count: smsResult.ok ? 0 : 2,
      error_message: smsResult.error || null,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        booking_reference: booking.booking_reference,
        email: emailResult,
        sms: smsResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-booking-confirmation] Handler catch:', err);
    // Return friendly error response so booking flow never crashes
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal notification error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

