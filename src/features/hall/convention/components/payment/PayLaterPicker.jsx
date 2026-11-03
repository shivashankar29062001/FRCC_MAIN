import { useState } from 'react';

const PROVIDERS = ['Simpl', 'LazyPay', 'ICICI PayLater'];

export default function PayLaterPicker({ amount, onValid }) {
  const [p, setP] = useState('');
  const [checking, setChecking] = useState(false);
  const [eligible, setEligible] = useState(null);

  const check = async (x) => {
    setP(x); setEligible(null); setChecking(true); onValid(false, {});
    await new Promise(r => setTimeout(r, 900));
    const ok = x !== 'Simpl' || amount <= 50000; // Simpl caps at 50k (mock rule)
    setChecking(false); setEligible(ok);
    onValid(ok, ok ? { maskedInstrument: x } : {});
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map(x => (
          <button type="button" key={x} onClick={() => check(x)}
            className={`border rounded-full px-4 py-2 ${p === x ? 'bg-navy text-gold border-gold' : 'bg-white'}`}>{x}</button>
        ))}
      </div>
      {checking && <p className="text-sm text-gray-500">Checking eligibility…</p>}
      {eligible === true && <p className="text-green-700 text-sm">✓ Eligible with {p}. You'll pay later at their billing cycle.</p>}
      {eligible === false && <p className="text-red-600 text-sm">✕ Not eligible with {p} for this amount. Try another provider.</p>}
    </div>
  );
}
