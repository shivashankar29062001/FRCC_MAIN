# Supabase Edge Function: `send-booking-confirmation`

Delivers parking and facility booking confirmations to the user's registered email and mobile number.

## Execution Model
- Runs server-side in Supabase Edge Functions environment (Deno).
- Invoked via `supabase.functions.invoke('send-booking-confirmation', { body: { booking_id } })`.
- Reads user profile securely using the service role key.
- Idempotent: checks and records delivery in `public.notification_log` table.
- Rate-limited: max 3 resends per booking reference.

## Configuration Secrets
Set these secrets in the Supabase Dashboard (`Project Settings` > `Edge Functions` > `Secrets`) or via Supabase CLI (`supabase secrets set KEY=VALUE`):

- `EMAIL_API_KEY`: API key for email delivery provider (e.g. Resend)
- `EMAIL_FROM`: Verified sender email address (e.g. `bookings@frcc.in`)
- `SMS_API_KEY`: API key for SMS gateway provider
- `SMS_SENDER_ID`: Approved DLT / SMS sender ID (e.g. `FRCCIN`)
- `WHATSAPP_TOKEN`: Optional WhatsApp Business Cloud API bearer token

## Log-Only Testing Mode
If the provider secrets above are not configured, the function automatically operates in **log-only mode**:
- It logs the complete payload (recipient, booking reference, campus, slot, vehicle number, date and time) to the function logs.
- Marks status as `skipped` in `public.notification_log`.
- Never attempts to send external messages.
- Allows local and sandbox testing safely without incurring costs or sending test messages to real users.

