import { verifyHallUpi } from './hallBookingService.js';

// UPI VPA verification for convention hall payments (no Express fallback).
// TODO-RAZORPAY: swap verifyHallUpi implementation for live Razorpay/Cashfree VPA validation API.
export async function verifyUPI(upiId) {
  return verifyHallUpi(upiId);
}
