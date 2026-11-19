// ---------------------------------------------------------------------------
// supabase/functions/send-booking-confirmation/index.ts
// Supabase Edge Function to deliver booking confirmations and cancellations
// to user's registered email, mobile (SMS), and WhatsApp.
// Runs server-side with service role; safe idempotent execution.
// ---------------------------------------------------------------------------

declare const Deno: any;

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { sendNotificationEmail } from './email.ts';
import { sendNotificationSms } from './sms.ts';
import { sendNotificationWhatsApp } from './whatsapp.ts';

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
    const body = await req.json().catch(() => ({}));
    const booking_id = body.booking_id || body.bookingId;
    const is_resend = Boolean(body.is_resend);
    const event_type = body.event_type || (String(body.type || '').includes('cancel') ? 'booking_cancelled' : 'booking_confirmed');
    const requestedServiceType = body.service_type || body.serviceType || (String(body.type || '').startsWith('hall') ? 'hall' : undefined);

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch booking record from convention_bookings, parking_bookings, stay_bookings, or bookings
    let booking: any = null;
    let serviceType: 'hall' | 'parking' | 'stay' | 'activity' = 'parking';

    if (requestedServiceType === 'hall' || String(booking_id).startsWith('FRCC-H-')) {
      const { data: hallBooking } = await supabaseAdmin
        .from('convention_bookings')
        .select('*')
        .eq('id', booking_id)
        .maybeSingle();

      if (hallBooking) {
        booking = hallBooking;
        serviceType = 'hall';
      }
    }

    if (!booking && (requestedServiceType === 'parking' || String(booking_id).includes('PARK'))) {
      const { data: parkingBooking } = await supabaseAdmin
        .from('parking_bookings')
        .select('*')
        .or(`id.eq.${booking_id},booking_reference.eq.${booking_id}`)
        .maybeSingle();

      if (parkingBooking) {
        booking = parkingBooking;
        serviceType = 'parking';
      }
    }

    if (!booking && (requestedServiceType === 'stay' || String(booking_id).includes('STAY') || String(booking_id).startsWith('FRCC-S-'))) {
      const { data: stayBooking } = await supabaseAdmin
        .from('stay_bookings')
        .select('*, room_types(*)')
        .or(`id.eq.${booking_id},booking_ref.eq.${booking_id}`)
        .maybeSingle();

      if (stayBooking) {
        booking = stayBooking;
        serviceType = 'stay';
      }
    }

    if (!booking) {
      // General bookings table (activities, dining, etc.)
      const { data: genBooking } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .or(`id.eq.${booking_id},booking_id.eq.${booking_id}`)
        .maybeSingle();

      if (genBooking) {
        booking = genBooking;
        serviceType = genBooking.category === 'activity' ? 'activity' : 'hall';
      }
    }

    if (!booking) {
      // Fallback: check parking_bookings
      const { data: parkingBooking } = await supabaseAdmin
        .from('parking_bookings')
        .select('*')
        .or(`id.eq.${booking_id},booking_reference.eq.${booking_id}`)
        .maybeSingle();

      if (parkingBooking) {
        booking = parkingBooking;
        serviceType = 'parking';
      }
    }

    if (!booking) {
      // Fallback: check convention_bookings
      const { data: hallBooking } = await supabaseAdmin
        .from('convention_bookings')
        .select('*')
        .eq('id', booking_id)
        .maybeSingle();

      if (hallBooking) {
        booking = hallBooking;
        serviceType = 'hall';
      }
    }

    if (!booking) {
      // Fallback: check stay_bookings
      const { data: stayBooking } = await supabaseAdmin
        .from('stay_bookings')
        .select('*, room_types(*)')
        .or(`id.eq.${booking_id},booking_ref.eq.${booking_id}`)
        .maybeSingle();

      if (stayBooking) {
        booking = stayBooking;
        serviceType = 'stay';
      }
    }

    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingRef = booking.booking_reference || booking.id;

    // 2. Read user contact info
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

      if (!registeredEmail || !registeredMobile) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
        if (authUser?.user) {
          registeredEmail = registeredEmail || authUser.user.email || '';
          registeredMobile = registeredMobile || authUser.user.phone || authUser.user.user_metadata?.phone || '';
          registeredName = registeredName || authUser.user.user_metadata?.full_name || '';
        }
      }
    }

    // Direct fallbacks from booking record
    registeredEmail = registeredEmail || booking.email || booking.guest_email || booking.details?.email || '';
    registeredMobile = registeredMobile || booking.mobile || booking.phone || booking.guest_mobile || booking.details?.mobile || '';
    registeredName = registeredName || booking.organizer_name || booking.guest_name || booking.user_name || booking.name || '';

    // 3. Rate-limiting for resends (max 3 resends per booking)
    if (is_resend) {
      const { count } = await supabaseAdmin
        .from('notification_log')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', bookingRef)
        .eq('channel', 'email');

      if (count && count >= 3) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Maximum of 3 notification resends reached for this booking.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Idempotency check: if not a resend, don't duplicate sent confirmations
    if (!is_resend && event_type === 'booking_confirmed') {
      const { data: existingSend } = await supabaseAdmin
        .from('notification_log')
        .select('id, channel, status')
        .eq('booking_id', bookingRef)
        .eq('status', 'sent');

      if (existingSend && existingSend.length > 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: true,
            message: 'Notification already delivered for this booking.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Format common details depending on service
    const isHall = serviceType === 'hall';
    const isStay = serviceType === 'stay';
    const isParking = serviceType === 'parking';
    const isActivity = serviceType === 'activity';

    const title = isHall
      ? (booking.hall_name || 'Convention Hall')
      : isStay
      ? (booking.room_types?.name || booking.room_name || 'Stay & Accommodation')
      : isParking
      ? `Parking Slot ${booking.slot_id || booking.parkingSlot || 'A01'}`
      : (booking.title || booking.details?.gameName || 'Activity Reservation');

    const campus = isHall
      ? (booking.venue_name || (booking.city ? `${booking.city} Club` : 'Hyderabad Club'))
      : isStay
      ? (booking.venue_name || booking.area_name || 'Vijayawada Campus')
      : isParking
      ? (booking.campus ? (booking.campus.toLowerCase().includes('hyd') ? 'Hyderabad Campus' : 'Vijayawada Campus') : 'Vijayawada Campus')
      : (booking.area_name || booking.details?.areaName || booking.details?.location || 'Vijayawada Campus');

    const dateStr = booking.date || booking.booking_date || booking.check_in || '';
    const timeStr = isHall
      ? `${booking.start_time || ''} – ${booking.end_time || ''}`
      : isStay
      ? `Check-in: ${booking.check_in || ''}, Check-out: ${booking.check_out || ''}`
      : isParking
      ? (booking.arrival_time || '')
      : (booking.slot || '');

    const totalAmount = isHall
      ? (booking.amount || booking.amount_paid || 0)
      : isStay
      ? (booking.total ?? 0)
      : isParking
      ? (booking.total_amount ?? 0)
      : (booking.amount ?? booking.subtotal ?? 0);

    const refundAmount = booking.refund_amount;
    const refundStatusText = booking.refund_status === 'PROCESSED'
      ? 'Refund processed'
      : (booking.refund_amount > 0 ? 'Refund pending' : 'No refund due');

    // 5. Send Email
    const emailResult = registeredEmail
      ? await sendNotificationEmail({
          serviceType,
          eventType: event_type as any,
          bookingReference: bookingRef,
          title,
          campus,
          date: dateStr,
          time: timeStr,
          guests: isHall ? booking.guests : undefined,
          totalAmount,
          refundAmount,
          refundStatusText,
          recipientEmail: registeredEmail,
          recipientName: registeredName,
          myBookingsUrl: 'https://frcc.in/my-bookings',
        })
      : { ok: true, channel: 'email' as const, status: 'skipped' as const, error: 'No registered email found' };

    await supabaseAdmin.from('notification_log').insert({
      booking_id: bookingRef,
      service_type: serviceType,
      channel: 'email',
      recipient: registeredEmail || 'none',
      status: emailResult.status,
      retry_count: emailResult.ok ? 0 : 2,
      error_message: emailResult.error || null,
      sent_at: new Date().toISOString(),
    });

    // 6. Send SMS
    const smsResult = registeredMobile
      ? await sendNotificationSms({
          serviceType,
          eventType: event_type as any,
          bookingReference: bookingRef,
          title,
          campus,
          date: dateStr,
          time: timeStr,
          totalAmount,
          refundAmount,
          recipientMobile: registeredMobile,
          myBookingsUrl: 'https://frcc.in/my-bookings',
        })
      : { ok: true, channel: 'sms' as const, status: 'skipped' as const, error: 'No registered mobile found' };

    await supabaseAdmin.from('notification_log').insert({
      booking_id: bookingRef,
      service_type: serviceType,
      channel: 'sms',
      recipient: registeredMobile || 'none',
      status: smsResult.status,
      retry_count: smsResult.ok ? 0 : 2,
      error_message: smsResult.error || null,
      sent_at: new Date().toISOString(),
    });

    // 7. Send WhatsApp
    const waResult = registeredMobile
      ? await sendNotificationWhatsApp({
          serviceType,
          eventType: event_type as any,
          bookingReference: bookingRef,
          title,
          venueOrCampus: campus,
          date: dateStr,
          time: timeStr,
          amount: totalAmount,
          refundAmount,
          refundStatusText,
          recipientMobile: registeredMobile,
          recipientName: registeredName,
          detailsUrl: 'https://frcc.in/my-bookings',
        })
      : { ok: true, channel: 'whatsapp' as const, status: 'skipped' as const, error: 'No registered mobile found' };

    await supabaseAdmin.from('notification_log').insert({
      booking_id: bookingRef,
      service_type: serviceType,
      channel: 'whatsapp',
      recipient: registeredMobile || 'none',
      status: waResult.status,
      retry_count: waResult.ok ? 0 : 2,
      error_message: waResult.error || null,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        booking_reference: bookingRef,
        service_type: serviceType,
        event_type,
        email: emailResult,
        sms: smsResult,
        whatsapp: waResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-booking-confirmation] Handler catch:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal notification error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
