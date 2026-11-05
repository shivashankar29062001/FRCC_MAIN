// SMTP email adapter (nodemailer). Credentials are read only from the server environment.

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

let transporter = null;
let transporterKey = '';

function getTransporter() {
  if (!nodemailer) {
    throw new Error('nodemailer is not installed. Please install it in the server directory.');
  }
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host || !process.env.MAIL_FROM) {
    throw new Error('SMTP is not configured (host or MAIL_FROM missing).');
  }

  const key = `${host}:${port}:${user}:${!!pass}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    transporterKey = key;
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();
  const info = await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html,
  });
  return { ref: info.messageId || null };
}

module.exports = { sendEmail };
