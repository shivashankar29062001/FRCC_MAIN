import { useState } from 'react';

const WALLETS = ['Paytm Wallet', 'PhonePe Wallet', 'Amazon Pay Balance', 'Mobikwik', 'Freecharge'];

export default function WalletPicker({ onValid }) {
  const [w, setW] = useState('');
  return (
    <div className="flex flex-wrap gap-2">
      {WALLETS.map(x => (
        <button type="button" key={x} onClick={() => { setW(x); onValid(true, { maskedInstrument: x }); }}
          className={`border rounded-full px-4 py-2 ${w === x ? 'bg-navy text-gold border-gold' : 'bg-white'}`}>{x}</button>
      ))}
    </div>
  );
}
