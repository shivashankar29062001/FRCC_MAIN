// Meta WhatsApp Cloud API adapter. Live mode requires an approved message template.
// The template must use one body parameter containing the approved wording from templates.js.

async function sendWhatsApp({ to, message, templateName }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = templateName || process.env.WHATSAPP_TEMPLATE_CONFIRMED;

  if (!token || !phoneNumberId || !template) {
    throw new Error('WhatsApp is not configured (token, phone number ID or template missing).');
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: message }],
        }],
      },
    }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`WhatsApp request failed (${res.status}): ${body.slice(0, 200)}`);

  let data = {};
  try { data = JSON.parse(body); } catch { /* provider may return plain text */ }
  return { ref: data.messages?.[0]?.id || null };
}

module.exports = { sendWhatsApp };
