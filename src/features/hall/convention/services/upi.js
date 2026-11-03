import { api } from './api';

// Mock-backed UPI VPA verification.
// TODO: swap this implementation for a real gateway validation API
// (e.g. Razorpay/Cashfree). The component never changes — only this file.
export async function verifyUPI(upiId) {
  return api('/payments/verify-upi', { method: 'POST', body: { upiId }, auth: false });
}
