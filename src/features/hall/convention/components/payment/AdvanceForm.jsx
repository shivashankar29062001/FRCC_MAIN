import { useEffect, useRef, useState } from 'react';
import UpiIdFlow from './UpiIdFlow';
import CardForm from './CardForm';
import NetBankingPicker from './NetBankingPicker';
import WalletPicker from './WalletPicker';

const ONLINE = [
  { id: 'upi', name: 'UPI ID' },
  { id: 'card', name: 'Credit / Debit Card' },
  { id: 'netbanking', name: 'Net Banking' },
  { id: 'wallet', name: 'Wallet' },
];

export default function AdvanceForm({ total, onValid }) {
  const [pct, setPct] = useState(25);
  const [mode, setMode] = useState('upi');
  const advance = Math.round(total * pct / 100);
  const balance = total - advance;
  // Remember the last reported validity/instrument so changing the percentage
  // (or total) can re-report the new advance and balance amounts.
  const last = useRef({ valid: false, payload: {} });

  const wrap = (v, p) => {
    const payload = { ...p, maskedInstrument: p.maskedInstrument || 'Advance payment', advance, balanceDue: balance };
    last.current = { valid: v, payload };
    onValid(v, payload);
  };

  // Re-report whenever advance or balance changes (e.g. slider moved).
  useEffect(() => {
    if (last.current.valid || last.current.payload.maskedInstrument) {
      onValid(last.current.valid, { ...last.current.payload, advance, balanceDue: balance });
    }
  }, [advance, balance]);

  return (
    <div className="space-y-4">
      <div className="bg-stone-50 border rounded p-3 text-sm">
        Advance: <strong>₹{advance}</strong> ({pct}%) • Due at venue: <strong>₹{balance}</strong>
        <input type="range" min="10" max="90" value={pct} onChange={e => setPct(Number(e.target.value))} className="w-full mt-2" />
      </div>
      <div className="flex flex-wrap gap-2">
        {ONLINE.map(o => (
          <button type="button" key={o.id} onClick={() => { setMode(o.id); last.current = { valid: false, payload: {} }; onValid(false, {}); }}
            className={`border rounded-full px-3 py-1 text-sm ${mode === o.id ? 'bg-navy text-gold border-gold' : 'bg-white'}`}>{o.name}</button>
        ))}
      </div>
      {mode === 'upi' && <UpiIdFlow onValid={wrap} />}
      {mode === 'card' && <CardForm kind="credit" onValid={wrap} />}
      {mode === 'netbanking' && <NetBankingPicker onValid={wrap} />}
      {mode === 'wallet' && <WalletPicker onValid={wrap} />}
    </div>
  );
}
