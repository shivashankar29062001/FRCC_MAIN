// Booking notification orchestrator. This is the only server module that knows
// which providers exist. Provider failures never block or roll back a booking.

const { readDb, writeDb, uid } = require('../db');
const templates = require('./templates');
const { sendSms } = require('./sms');
const { sendWhatsApp } = require('./whatsapp');
const { sendEmail } = require('./email');

const CHANNELS = ['SMS', 'WHATSAPP', 'EMAIL'];
const MAX_ATTEMPTS = 4; // initial attempt + retries after 1, 5 and 15 minutes
const RETRY_DELAYS_MS = { 1: 60 * 1000, 2: 5 * 60 * 1000, 3: 15 * 60 * 1000 };
const inflight = new Set();
const retryRecipients = new Map();

let policyModulePromise;
function loadPolicyModule() {
  if (!policyModulePromise) policyModulePromise = import('../../shared/refundPolicy.js');
  return policyModulePromise;
}

function mode() {
  return String(process.env.NOTIFY_MODE || 'mock').toLowerCase() === 'live' ? 'live' : 'mock';
}

function notificationKey(bookingId, type, channel) {
  return `${bookingId}:${type}:${channel}`;
}

function ensureLog(db) {
  if (!Array.isArray(db.notification_log)) db.notification_log = [];
  return db.notification_log;
}

function findRecord(bookingId, type, channel) {
  const db = readDb();
  return ensureLog(db).find(r =>
    r.bookingId === bookingId && r.type === type && r.channel === channel
  ) || null;
}

function saveRecord(record) {
  const db = readDb();
  const log = ensureLog(db);
  const index = log.findIndex(r =>
    r.bookingId === record.bookingId && r.type === record.type && r.channel === record.channel
  );
  if (index >= 0) log[index] = { ...log[index], ...record };
  else log.push(record);
  writeDb(db);
  return record;
}

function updateRecord(id, patch) {
  const db = readDb();
  const log = ensureLog(db);
  const record = log.find(r => r.id === id);
  if (!record) return null;
  Object.assign(record, patch);
  writeDb(db);
  return record;
}

function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return null;
}

function isValidEmail(raw) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(raw || '').trim());
}

function maskPhone(phone) {
  return phone ? `${phone.slice(0, 3)}******${phone.slice(-4)}` : '';
}

function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!domain) return '';
  return `${local.slice(0, 1)}***@${domain}`;
}

function recipientFor(booking, channel) {
  if (channel === 'EMAIL') {
    const email = String(booking.email || '').trim();
    return isValidEmail(email)
      ? { valid: true, to: email, masked: maskEmail(email) }
      : { valid: false, to: '', masked: '', error: 'Missing or invalid email address.' };
  }
  const phone = normalizePhone(booking.phone);
  return phone
    ? { valid: true, to: phone, masked: maskPhone(phone) }
    : { valid: false, to: '', masked: '', error: 'Missing or invalid Indian phone number.' };
}

function templateFor(type, channel) {
  if (channel === 'SMS') {
    return type === 'CANCELLED'
      ? process.env.MSG91_TEMPLATE_ID_CANCELLED
      : process.env.MSG91_TEMPLATE_ID_CONFIRMED;
  }
  if (channel === 'WHATSAPP') {
    return type === 'CANCELLED'
      ? process.env.WHATSAPP_TEMPLATE_CANCELLED
      : process.env.WHATSAPP_TEMPLATE_CONFIRMED;
  }
  return null;
}

function payloadFor(messages, channel) {
  if (channel === 'EMAIL') {
    return { subject: messages.email.subject, text: messages.email.text, html: messages.email.html };
  }
  return { message: channel === 'SMS' ? messages.sms : messages.whatsapp };
}

async function callProvider(channel, recipient, payload) {
  if (channel === 'SMS') {
    return sendSms({
      to: recipient,
      message: payload.message,
      templateId: payload.templateId,
    });
  }
  if (channel === 'WHATSAPP') {
    return sendWhatsApp({
      to: recipient,
      message: payload.message,
      templateName: payload.templateName,
    });
  }
  return sendEmail({
    to: recipient,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

function logSkip(booking, type, channel, recipient, error) {
  const now = new Date().toISOString();
  const record = {
    id: uid('NL'),
    bookingId: booking.id,
    type,
    channel,
    maskedRecipient: recipient.masked || '',
    status: 'FAILED',
    providerRef: null,
    error,
    attempts: 0,
    permanent: true,
    message: '',
    subject: null,
    createdAt: now,
    updatedAt: now,
    nextRetryAt: null,
  };
  saveRecord(record);
  console.warn(`[notify] ${booking.id} ${type} ${channel}: ${error}`);
}

async function deliver(booking, type, channel, messages, policy) {
  const existing = findRecord(booking.id, type, channel);
  if (existing) return { skipped: true, existing: true };

  const key = notificationKey(booking.id, type, channel);
  if (inflight.has(key)) return { skipped: true, inflight: true };

  const recipient = recipientFor(booking, channel);
  if (!recipient.valid) {
    logSkip(booking, type, channel, recipient, recipient.error);
    return { skipped: true, invalidRecipient: true };
  }

  inflight.add(key);
  const now = new Date().toISOString();
  const payload = payloadFor(messages, channel);
  const templateId = templateFor(type, channel);
  const fullMessage = channel === 'EMAIL' ? payload.text : payload.message;
  const record = {
    id: uid('NL'),
    bookingId: booking.id,
    type,
    channel,
    maskedRecipient: recipient.masked,
    status: 'FAILED',
    providerRef: null,
    error: null,
    attempts: 1,
    permanent: false,
    message: fullMessage,
    subject: channel === 'EMAIL' ? payload.subject : null,
    createdAt: now,
    updatedAt: now,
    nextRetryAt: null,
  };

  try {
    if (mode() === 'mock') {
      record.status = 'MOCK';
      console.log(
        `[notify:MOCK] ${type} ${channel} -> ${recipient.masked}\n` +
        (channel === 'EMAIL' ? `Subject: ${payload.subject}\n${payload.text}` : payload.message)
      );
    } else {
      const result = await callProvider(channel, recipient.to, {
        ...payload,
        templateId,
        templateName: templateId,
      });
      record.status = 'SENT';
      record.providerRef = result?.ref || null;
      console.log(`[notify:SENT] ${type} ${channel} -> ${recipient.masked} ref=${record.providerRef || '—'}`);
    }
  } catch (error) {
    record.status = 'FAILED';
    record.error = String(error?.message || error || 'Provider failed').slice(0, 500);
    console.error(`[notify:FAILED] ${type} ${channel} -> ${recipient.masked}: ${record.error}`);
  } finally {
    inflight.delete(key);
  }

  const saved = saveRecord(record);

  if (saved.status === 'FAILED' && !saved.permanent) {
    retryRecipients.set(saved.id, {
      to: recipient.to,
      channel,
      type,
      payload: { ...payload, templateId, templateName: templateId },
    });
    scheduleRetry(saved.id, 1);
  }

  return { status: saved.status };
}

function scheduleRetry(logId, failedAttempt) {
  const delay = RETRY_DELAYS_MS[failedAttempt];
  if (!delay) return;
  const nextRetryAt = new Date(Date.now() + delay).toISOString();
  updateRecord(logId, { nextRetryAt });
  const timer = setTimeout(() => {
    retry(logId).catch((error) => {
      console.error(`[notify:RETRY] ${logId}: ${error?.message || error}`);
    });
  }, delay);
  if (typeof timer.unref === 'function') timer.unref();
}

async function retry(logId) {
  if (mode() !== 'live') return null;
  const db = readDb();
  const record = ensureLog(db).find(r => r.id === logId);
  if (!record || record.permanent || record.status === 'SENT' || record.status === 'MOCK') return record;
  if (record.attempts >= MAX_ATTEMPTS) return record;

  const job = retryRecipients.get(logId);
  if (!job) return record;

  const attempt = record.attempts + 1;
  updateRecord(logId, { attempts: attempt, updatedAt: new Date().toISOString(), nextRetryAt: null });

  try {
    const result = await callProvider(job.channel, job.to, job.payload);
    retryRecipients.delete(logId);
    return updateRecord(logId, {
      status: 'SENT',
      providerRef: result?.ref || null,
      error: null,
      attempts: attempt,
      updatedAt: new Date().toISOString(),
      nextRetryAt: null,
    });
  } catch (error) {
    const message = String(error?.message || error || 'Provider failed').slice(0, 500);
    const retryAgain = attempt < MAX_ATTEMPTS;
    updateRecord(logId, {
      status: 'FAILED',
      error: message,
      attempts: attempt,
      updatedAt: new Date().toISOString(),
    });
    if (retryAgain) scheduleRetry(logId, attempt);
    else retryRecipients.delete(logId);
    return null;
  }
}

async function dispatch(booking, type) {
  if (!booking?.id) return { skipped: true };
  const { getRefundPolicy } = await loadPolicyModule();

  let policy = {};
  if (type === 'CANCELLED') {
    const calculated = getRefundPolicy(booking, new Date());
    policy = {
      ...calculated,
      refundPercent: booking.refundPercent > 0 ? Number(booking.refundPercent) : calculated.refundPercent,
      refundAmount: booking.refundAmount != null ? Number(booking.refundAmount) : calculated.refundAmount,
    };
  }

  const messages = templates.buildBookingMessages(booking, type, policy);
  // Consent off means email only. Existing bookings without the field keep all channels.
  const channels = booking.notifyUpdates === false ? ['EMAIL'] : CHANNELS;

  const results = await Promise.allSettled(
    channels.map(channel => deliver(booking, type, channel, messages, policy))
  );
  return {
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'failed' }),
  };
}

function sendBookingConfirmed(booking) {
  return dispatch(booking, 'CONFIRMED');
}

function sendBookingCancelled(booking) {
  return dispatch(booking, 'CANCELLED');
}

function sendBookingPending(booking) {
  return dispatch(booking, 'PENDING');
}

module.exports = {
  sendBookingConfirmed,
  sendBookingCancelled,
  sendBookingPending,
  // Exported for tests/diagnostics only; never exposed through an API route.
  _private: { normalizePhone, isValidEmail, maskPhone, maskEmail, retry },
};
