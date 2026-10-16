// TODO: Replace this mock with a real payment-gateway VPA validation API
// (e.g. Razorpay "validateVPA" or Cashfree). Only this file needs to change;
// the payment page calls client `verifyUPI` which hits POST /api/payments/verify-upi.
// Never log or persist the full UPI ID — only a masked version and the transaction ref.

const SAMPLE_NAMES = [
  'Ravi K***', 'Priya S***', 'Anita M***', 'Vikram G***',
  'Sanjay R***', 'Meena D***', 'Arjun P***', 'Kavitha N***'
];

function mockVerifyUPI(upiId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const valid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId);
      if (!valid) return resolve({ ok: false, reason: 'Invalid UPI ID format' });
      
      const local = upiId.split('@')[0].toLowerCase();
      
      // Test UPI IDs for demo
      if (local === 'success') {
        return resolve({ ok: true, name: 'Test User' });
      }
      if (local === 'fail') {
        return resolve({ ok: false, reason: 'This UPI ID could not be found at the bank' });
      }
      
      // Simulate a small chance of a non-existent / invalid payee for retry demo
      if (local.includes('invalid') || local.includes('fail')) {
        return resolve({ ok: false, reason: 'This UPI ID could not be found at the bank' });
      }
      
      const idx = [...upiId].reduce((a, c) => a + c.charCodeAt(0), 0) % SAMPLE_NAMES.length;
      resolve({ ok: true, name: SAMPLE_NAMES[idx] });
    }, 1200); // simulated network delay
  });
}

module.exports = { mockVerifyUPI };
