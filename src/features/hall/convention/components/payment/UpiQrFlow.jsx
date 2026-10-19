import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { verifyPayment } from '../../services/payment';

export default function UpiQrFlow({ amount, onValid }) {
  const [secs, setSecs] = useState(300);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const upiLink = `upi://pay?pa=frccconventions@okhdfc&pn=FRCC%20CONVENTIONS&am=${amount}&cu=INR`;

  useEffect(() => {
    if (paid || secs <= 0) return;
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [paid, secs]);

  const check = async () => {
    setChecking(true);
    try {
      const r = await verifyPayment('QR_' + Date.now());
      if (r.status === 'SUCCESS') { setPaid(true); onValid(true, { maskedInstrument: 'UPI QR' }); }
      else onValid(false, {});
    } finally { setChecking(false); }
  };

  const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center">
      <div className="bg-white border rounded p-3">
        <QRCodeSVG value={upiLink} size={160} />
      </div>
      <div className="space-y-3 text-center sm:text-left">
        <p className="text-sm">Scan with any UPI app to pay <strong>₹{amount}</strong>.</p>
        <p className={`text-2xl font-mono ${secs < 60 ? 'text-red-600' : 'text-navy'}`}>{mm}:{ss}</p>
        <p className="text-xs text-gray-500">QR code expires in 5 minutes.</p>
        {secs <= 0 && !paid ? (
          <button type="button" onClick={() => { setSecs(300); setPaid(false); onValid(false, {}); }} className="border border-navy text-navy rounded px-4 py-2">Refresh QR</button>
        ) : paid ? (
          <p className="text-green-700 font-semibold">✓ Payment received</p>
        ) : (
          <button type="button" onClick={check} disabled={checking} className="bg-navy text-gold rounded px-4 py-2 font-semibold disabled:opacity-50">
            {checking ? 'Checking…' : 'I have paid'}
          </button>
        )}
      </div>
    </div>
  );
}
