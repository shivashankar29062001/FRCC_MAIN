import { useState } from 'react';
import UpiIdFlow from './UpiIdFlow';

const APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'CRED'];

export default function UpiAppPicker({ onValid }) {
  const [app, setApp] = useState('');
  const [upiValid, setUpiValid] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Choose a UPI app</p>
      <div className="flex flex-wrap gap-2">
        {APPS.map(a => (
          <button type="button" key={a} onClick={() => { setApp(a); onValid(upiValid && true, {}); }}
            className={`px-3 py-1.5 rounded-full border ${app === a ? 'bg-navy text-gold border-gold' : 'bg-white'}`}>{a}</button>
        ))}
      </div>
      <UpiIdFlow onValid={(v, p) => { setUpiValid(v); onValid(v && !!app, { ...p, maskedInstrument: p.maskedInstrument ? `${p.maskedInstrument} via ${app}` : null }); }} />
      {!app && <p className="text-amber-600 text-sm">Pick a UPI app to continue.</p>}
    </div>
  );
}
