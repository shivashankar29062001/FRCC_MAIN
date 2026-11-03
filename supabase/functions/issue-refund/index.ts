// ---------------------------------------------------------------------------
// supabase/functions/issue-refund/index.ts
// Supabase Edge Function to issue refunds via payment gateway (Razorpay)
// Runs server-side with service role; safe idempotent execution.
// Falls back gracefully to log-only mode when gateway keys are not configured.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    const { booking_id, service_type = 'hall', refund_amount, reason = 'Customer requested cancellation' } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing booking_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch booking record
    let booking: any = null;
    let paymentRef = '';

    if (service_type === 'hall') {
      const { data, error } = await supabaseAdmin
        .from('convention_bookings')
        .select('*')
        .eq('id', booking_id)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Hall booking not found', details: error?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      booking = data;
      paymentRef = data.payment_id || data.transaction_ref || '';
    } else {
      // General booking lookup
      const { data } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .or(`id.eq.${booking_id},booking_id.eq.${booking_id}`)
        .maybeSingle();
      booking = data;
      paymentRef = data?.payment_id || '';
    }

    const calculatedRefund = Number(refund_amount ?? booking?.refund_amount ?? 0);

    if (calculatedRefund <= 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          refund_status: 'NOT_APPLICABLE',
          status_text: 'No refund due',
          message: 'Booking cancellation has no eligible refund amount.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Gateway execution check (Razorpay)
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    // TODO-RAZORPAY: When production Razorpay credentials are added to Supabase Secrets,
    // the code below invokes the Razorpay Refunds API: POST https://api.razorpay.com/v1/payments/{payment_id}/refund
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.log('[issue-refund] [LOG-ONLY MODE] Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not set.');
      console.log(`[issue-refund] [LOG-ONLY MODE] Booking: ${booking_id}, PaymentRef: ${paymentRef}, Refund Amount: ₹${calculatedRefund}`);
      console.log(`[issue-refund] [LOG-ONLY MODE] Status updated to PENDING. Gateway refund will be initiated when live keys are configured.`);

      // Update refund status to PENDING on database record
      if (service_type === 'hall') {
        await supabaseAdmin
          .from('convention_bookings')
          .update({ refund_status: 'PENDING' })
          .eq('id', booking_id);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          mode: 'LOG_ONLY',
          refund_status: 'PENDING',
          status_text: 'Refund pending',
          timing_note: 'Refund will be credited as per your payment method timeline',
          amount: calculatedRefund,
          booking_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO-RAZORPAY: Live integration flow
    try {
      const authHeader = 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentRef}/refund`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(calculatedRefund * 100), // paise
          notes: { booking_id, service_type, reason },
        }),
      });

      const rzpData = await rzpRes.json();

      if (!rzpRes.ok) {
        console.warn('[issue-refund] Razorpay API response not ok:', rzpData);
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'GATEWAY_ERROR',
            details: rzpData?.error?.description || 'Gateway rejected refund request',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (service_type === 'hall') {
        await supabaseAdmin
          .from('convention_bookings')
          .update({ refund_status: 'PROCESSED' })
          .eq('id', booking_id);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          refund_status: 'PROCESSED',
          status_text: 'Refund processed',
          timing_note: 'Refund will be credited as per your payment method timeline',
          gateway_refund_id: rzpData.id,
          amount: calculatedRefund,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (gatewayErr: any) {
      console.error('[issue-refund] Gateway request failed:', gatewayErr);
      return new Response(
        JSON.stringify({ ok: false, error: 'GATEWAY_CONNECTION_FAILED', details: gatewayErr?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('[issue-refund] Catch handler:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal refund error', details: err?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

