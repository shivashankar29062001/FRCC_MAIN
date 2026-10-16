import { useState } from 'react';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function CorporateForm({ onValid }) {
  const [f, setF] = useState({ company: '', gstin: '', addr: '', po: '' });
  const set = (k, v) => {
    const n = { ...f, [k]: v }; setF(n);
    const ok = n.company.trim().length >= 2 && GSTIN_RE.test(n.gstin.trim()) && n.addr.trim().length >= 5 && n.po.trim().length >= 2;
    onValid(ok, ok ? { maskedInstrument: `Corporate – ${n.company}`, gstin: n.gstin.trim().toUpperCase() } : {});
  };
  const input = "border rounded p-2 w-full mt-1";
  return (
    <div className="space-y-3 max-w-md">
      <label className="block text-sm">Company Name<input className={input} value={f.company} onChange={e => set('company', e.target.value)} /></label>
      <label className="block text-sm">GSTIN<input className={input} value={f.gstin} placeholder="22ABCDE1234F1Z5" onChange={e => set('gstin', e.target.value.toUpperCase())} />
        {f.gstin && !GSTIN_RE.test(f.gstin) && <span className="text-red-600 text-xs">Invalid GSTIN format</span>}</label>
      <label className="block text-sm">Billing Address<textarea className={input} rows={2} value={f.addr} onChange={e => set('addr', e.target.value)} /></label>
      <label className="block text-sm">PO Number<input className={input} value={f.po} onChange={e => set('po', e.target.value)} /></label>
      <p className="text-xs text-gray-500">A GST invoice will be generated. Booking stays <strong>PENDING_VERIFICATION</strong> until payment is received.</p>
    </div>
  );
}
