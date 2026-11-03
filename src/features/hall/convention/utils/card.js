// Card helpers: brand detection, Luhn check, expiry validation, EMI math.
export function luhnCheck(num) {
  const s = String(num).replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let n = +s[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return s.length >= 12 && sum % 10 === 0;
}

export function detectBrand(num) {
  const s = String(num).replace(/\D/g, '');
  if (/^4/.test(s)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(s)) return 'Mastercard';
  if (/^(60|65|81|82|508)/.test(s)) return 'RuPay';
  if (/^3[47]/.test(s)) return 'American Express';
  if (/^3[0689]/.test(s)) return 'Diners Club';
  return '';
}

export const cvvLength = (brand) => (brand === 'American Express' ? 4 : 3);

export function formatCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function isExpiryValid(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2];
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

export function maskCard(brand, num) {
  const s = String(num).replace(/\D/g, '');
  return `${brand || 'Card'} **** ${s.slice(-4)}`;
}

// Simple-interest EMI quote
export function emiQuote(amount, tenure, annualRate = 12) {
  const totalPayable = Math.round(amount * (1 + (annualRate * tenure) / (12 * 100)));
  return { monthly: Math.round(totalPayable / tenure), total: totalPayable, rate: annualRate, tenure };
}
