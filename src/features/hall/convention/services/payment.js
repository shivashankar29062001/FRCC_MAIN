// Mock payment service.
// TODO: Replace these mocks with a real gateway (Razorpay, Cashfree, PayU or CCAvenue)
// by editing ONLY this file. Never store full card numbers, CVVs or bank passwords —
// only masked references. Payments below use simulated delays and random success;
// use the "force next failure" toggle on the payment page to test the failure path.

const delay = (ms = 1200) => new Promise(r => setTimeout(r, ms));
let forceFailure = false;

// Test mode flag - can be set via environment variable
export const PAYMENT_MODE = import.meta.env.VITE_PAYMENT_MODE || 'mock';

// Test card numbers (Luhn valid)
export const TEST_CARDS = {
  SUCCESS: {
    VISA: '4111 1111 1111 1111',
    MASTERCARD: '5555 5555 5555 4444',
    RUPAY: '6521 6521 6521 6521',
    AMEX: '3782 822463 10005',
  },
  FAIL: '4000 0000 0000 0002',
};

export function setForceFailure(v) { forceFailure = v; }
export function isForceFailure() { return forceFailure; }

export async function initiatePayment(method, payload) {
  await delay();
  if (forceFailure) throw new Error('Payment failed at the gateway (forced).');
  
  // Check for test cards in payload
  if (payload.cardNumber) {
    const normalized = payload.cardNumber.replace(/\s/g, '');
    const failNormalized = TEST_CARDS.FAIL.replace(/\s/g, '');
    if (normalized === failNormalized) {
      throw new Error('Card declined (test card).');
    }
  }
  
  return { ref: `${method}_${Date.now()}`, status: 'SUCCESS' };
}

export async function verifyPayment(ref) {
  await delay(800);
  return forceFailure ? { status: 'FAILED' } : { status: 'SUCCESS' };
}

export async function refund(bookingId, amount) {
  await delay();
  return { ref: `RFD_${Date.now()}`, amount };
}

export function getEmiOptions(amount, bank = 'Any') {
  const tenures = [3, 6, 9, 12, 18, 24];
  return tenures.map(t => {
    const total = Math.round(amount * (1 + (12 * t) / 1200));
    return { tenure: t, monthly: Math.round(total / t), total, rate: 12, bank };
  });
}
