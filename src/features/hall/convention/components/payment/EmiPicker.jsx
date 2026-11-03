import { useState } from 'react';
import { getEmiOptions } from '../../services/payment';

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'IndusInd', 'IDFC First'];

export default function EmiPicker({ amount, kind, onValid }) {
  const [bank, setBank] = useState('');
  const [tenure, setTenure] = useState('');
  const isNoCost = kind === 'emi_no_cost';
  const tenureOptions = kind === 'emi_debit' ? [3, 6, 9, 12] : [3, 6, 9, 12, 18, 24];

  const options = bank ? getEmiOptions(amount, bank).filter(o => tenureOptions.includes(o.tenure)) : [];
  const quote = options.find(o => o.tenure === Number(tenure));

  const pick = (b, t) => {
    const q = getEmiOptions(amount, b).find(o => o.tenure === Number(t));
    if (q) {
      const monthly = isNoCost ? Math.round(amount / q.tenure) : q.monthly;
      onValid(true, {
        maskedInstrument: `${b} • ${q.tenure} mo EMI`,
        emiTenure: q.tenure,
        emiMonthlyAmount: monthly,
        emiTotal: isNoCost ? amount : q.total,
        noCost: isNoCost,
      });
    } else onValid(false, {});
  };

  return (
    <div className="space-y-3 max-w-md">
      <label className="block text-sm">Bank
        <select className="border rounded p-2 w-full mt-1" value={bank} onChange={e => { setBank(e.target.value); pick(e.target.value, tenure); }}>
          <option value="">Select bank</option>
          {BANKS.map(b => <option key={b}>{b}</option>)}
        </select></label>
      <label className="block text-sm">Tenure
        <select className="border rounded p-2 w-full mt-1" value={tenure} onChange={e => { setTenure(e.target.value); pick(bank, e.target.value); }}>
          <option value="">Select tenure</option>
          {tenureOptions.map(t => <option key={t} value={t}>{t} months</option>)}
        </select></label>
      {quote && (
        <div className="bg-stone-50 border rounded p-3 text-sm">
          <p>Monthly: <strong>₹{isNoCost ? Math.round(amount / quote.tenure) : quote.monthly}</strong></p>
          <p>Interest rate: {quote.rate}% p.a. {isNoCost && <span className="text-green-700">(No-cost: discount of ₹{quote.total - amount} applied)</span>}</p>
          <p>Total payable: <strong>₹{isNoCost ? amount : quote.total}</strong></p>
        </div>
      )}
    </div>
  );
}
