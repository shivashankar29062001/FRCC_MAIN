import { useState } from 'react';

export default function BankTransferForm({ onValid, bookingRef }) {
  const [utr, setUtr] = useState('');
  const count = (t) => navigator.clipboard && navigator.clipboard.writeText(t);
  const payRef = `FRCC-${bookingRef || 'BOOKING'}`;

  const report = (u) => onValid(u.trim().length >= 6, { utrNumber: u.trim(), maskedInstrument: 'Bank Transfer' });

  return (
    <div className="space-y-4">
      <div className="border border-gold bg-amber-50 rounded p-4 text-sm space-y-1">
        <p><strong>Account Name:</strong> FRCC CONVENTIONS <button type="button" className="text-navy underline text-xs" onClick={() => count('FRCC CONVENTIONS')}>Copy</button></p>
        <p><strong>Account Number:</strong> 50200012345678 <button type="button" className="text-navy underline text-xs" onClick={() => count('50200012345678')}>Copy</button></p>
        <p><strong>IFSC:</strong> HDFC0001234 • <strong>Bank:</strong> HDFC • <strong>Branch:</strong> City Centre</p>
        <p><strong>Remarks / Payment Ref:</strong> {payRef} <button type="button" className="text-navy underline text-xs" onClick={() => count(payRef)}>Copy</button></p>
      </div>
      <label className="block text-sm">UTR / Transaction Number
        <input className="border rounded p-2 w-full mt-1" value={utr} placeholder="Enter UTR/IMPS/NEFT reference"
          onChange={e => { setUtr(e.target.value); report(e.target.value); }} /></label>
      <label className="block text-sm">Upload payment screenshot (optional)
        <input type="file" accept="image/*" className="block mt-1 text-sm" /></label>
      <p className="text-xs text-gray-500">Your booking will be marked <strong>PENDING_VERIFICATION</strong> until an admin confirms receipt.</p>
    </div>
  );
}
