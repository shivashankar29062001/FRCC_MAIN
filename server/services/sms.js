// MSG91 SMS adapter. Live mode requires an approved DLT sender ID and template.
// The provider template must contain the same approved wording/variables as templates.js.

async function sendSms({ to, message, templateId }) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const sender = process.env.MSG91_SENDER_ID;
  const template = templateId || process.env.MSG91_TEMPLATE_ID_CONFIRMED;

  if (!authKey || !sender || !template) {
    throw new Error('MSG91 is not configured (auth key, sender ID or template ID missing).');
  }

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: authKey },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      template_id: template,
      sender,
      short_url: '0',
      recipients: [{ mobiles: to, message }],
    }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`MSG91 request failed (${res.status}): ${body.slice(0, 200)}`);

  let data = {};
  try { data = JSON.parse(body); } catch { /* provider may return plain text */ }
  return { ref: data.request_id || data.message_id || null };
}

module.exports = { sendSms };
