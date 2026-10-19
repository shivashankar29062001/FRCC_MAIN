import { useState } from 'react';

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB', 'Bank of Baroda', 'Canara', 'Union Bank', 'IDFC First', 'Yes Bank', 'IndusInd', 'Other'];

export default function NetBankingPicker({ onValid }) {
  const [q, setQ] = useState('');
  const [bank, setBank] = useState('');
  const [redirect, setRedirect] = useState(false);
  const list = BANKS.filter(b => b.toLowerCase().includes(q.toLowerCase()));

  if (redirect) {
    return (
      <div className="border rounded p-4 bg-stone-50">
        <p className="mb-3">Redirecting to <strong>{bank}</strong> secure login… (mock)</p>
        <div className="flex gap-2">
          <button type="button" className="bg-green-700 text-white rounded px-4 py-2" onClick={() => onValid(true, { maskedInstrument: bank })}>Simulate success</button>
          <button type="button" className="border border-red-500 text-red-600 rounded px-4 py-2" onClick={() => { setRedirect(false); onValid(false, {}); }}>Simulate failure</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <input className="border rounded p-2 w-full max-w-sm" placeholder="Search bank…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
        {list.map(b => (
          <button type="button" key={b} onClick={() => { setBank(b); setRedirect(true); onValid(false, {}); }}
            className={`border rounded p-2 text-sm ${bank === b ? 'border-gold bg-amber-50' : 'bg-white'}`}>{b}</button>
        ))}
      </div>
    </div>
  );
}
