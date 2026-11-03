import { useState } from 'react';
import { luhnCheck, detectBrand, cvvLength, formatCardNumber, isExpiryValid, maskCard } from '../../utils/card';

const BRAND_ICONS = { Visa: '💳 Visa', Mastercard: '💳 Mastercard', RuPay: '💳 RuPay', 'American Express': '💳 Amex', 'Diners Club': '💳 Diners' };

export default function CardForm({ kind, onValid }) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [save, setSave] = useState(false);
  const [err, setErr] = useState('');

  const brand = detectBrand(num);
  const digits = num.replace(/\D/g, '');
  const numOk = luhnCheck(num);
  const expOk = isExpiryValid(exp);
  const cvvOk = new RegExp(`^\\d{${cvvLength(brand)}}$`).test(cvv);
  const valid = numOk && name.trim().length >= 2 && expOk && cvvOk;

  const report = (n = num, nm = name, e = exp, c = cvv, s = save) => {
    const b = detectBrand(n);
    const v = luhnCheck(n) && nm.trim().length >= 2 && isExpiryValid(e) && new RegExp(`^\\d{${cvvLength(b)}}$`).test(c);
    const errorMsg = !v ? (
      !luhnCheck(n) ? 'Invalid card number (Luhn check failed)' :
      nm.trim().length < 2 ? 'Name on card is required' :
      !isExpiryValid(e) ? 'Past or invalid expiry' :
      !new RegExp(`^\\d{${cvvLength(b)}}$`).test(c) ? `CVV must be ${cvvLength(b)} digits` : ''
    ) : '';
    setErr(errorMsg);
    onValid(v, { cardKind: kind, brand: b, maskedInstrument: v ? maskCard(b, n) : null, saveToken: s, cardNumber: v ? n : undefined });
  };

  const input = "border rounded p-2 w-full mt-1";
  return (
    <div className="space-y-3 max-w-md">
      <label className="block text-sm">Card Number
        <input className={input} inputMode="numeric" value={num} placeholder="1234 5678 9012 3456"
          onChange={e => { const v = formatCardNumber(e.target.value); setNum(v); report(v, name, exp, cvv, save); }} />
        {num && !numOk && <span className="text-red-600 text-xs">Invalid card number (Luhn check failed)</span>}
        {brand && <span className="text-navy text-sm ml-2">{BRAND_ICONS[brand] || brand}</span>}
      </label>
      <label className="block text-sm">Name on Card
        <input className={input} value={name} onChange={e => { setName(e.target.value); report(num, e.target.value, exp, cvv, save); }} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">Expiry (MM/YY)
          <input className={input} placeholder="MM/YY" value={exp}
            onChange={e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); setExp(v); report(num, name, v, cvv, save); }} />
          {exp && !expOk && <span className="text-red-600 text-xs">Past or invalid expiry</span>}</label>
        <label className="block text-sm">CVV
          <input className={input} type="password" inputMode="numeric" maxLength={cvvLength(brand)} value={cvv}
            onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, cvvLength(brand)); setCvv(v); report(num, name, exp, v, save); }} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); report(num, name, exp, cvv, e.target.checked); }} />
        Save this card for future payments
      </label>
      {kind === 'credit' && <p className="text-xs text-gray-500">🌐 International cards accepted</p>}
      {kind === 'debit' && <p className="text-xs text-gray-500">Note: your bank may require PIN or OTP verification.</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </div>
  );
}
