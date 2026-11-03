import { useState } from 'react';
import { verifyUPI } from '../../services/upi';

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export function maskUpi(id) {
  const [local, bank] = id.split('@');
  return local.length <= 2 ? `${local[0] || ''}***@${bank}` : `${local.slice(0, 2)}***@${bank}`;
}

export default function UpiIdFlow({ onValid }) {
  const [upiId, setUpiId] = useState('');
  const [vState, setVState] = useState('idle');
  const [accountName, setAccountName] = useState('');
  const [vError, setVError] = useState('');
  const [confirmedTick, setConfirmedTick] = useState(false);

  const update = (id, state, name, tick) => {
    setUpiId(id); setVState(state); setAccountName(name);
    setVError(state === 'failed' ? 'Verification failed.' : '');
    setConfirmedTick(tick);
    onValid(state === 'verified' && tick, { maskedInstrument: state === 'verified' && tick ? maskUpi(id) : null, upiId: id });
  };

  const verify = async () => {
    if (!UPI_REGEX.test(upiId)) { setVState('failed'); setVError('Invalid UPI ID format. Expected e.g. name@bank.'); onValid(false, {}); return; }
    setVState('verifying'); setVError(''); setConfirmedTick(false); onValid(false, {});
    try {
      const r = await verifyUPI(upiId);
      if (r.ok) { setVState('verified'); setAccountName(r.name); onValid(false, { upiId }); }
      else { setVState('failed'); setVError(r.reason || 'Verification failed.'); onValid(false, {}); }
    } catch (e) { setVState('failed'); setVError(e.message); onValid(false, {}); }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm">UPI ID
        <input className="border rounded p-2 w-full" placeholder="name@bank" value={upiId}
          onChange={e => update(e.target.value, 'idle', '', false)} />
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={verify} disabled={vState === 'verifying' || !upiId}
          className="bg-gold text-navy font-semibold rounded px-4 py-2 disabled:opacity-50">
          {vState === 'verifying' ? 'Verifying…' : 'Verify UPI ID'}
        </button>
        {vState === 'verifying' && <span className="inline-block w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />}
        {vState === 'verified' && <span className="text-green-700 font-semibold">✓ Verified</span>}
        {vState === 'failed' && <span className="text-red-600">✕ {vError} <button type="button" onClick={verify} className="underline">Retry</button></span>}
      </div>
      {vState === 'verified' && (
        <div className="border border-gold bg-amber-50 rounded p-4">
          <p>UPI ID belongs to: <strong>{accountName}</strong>. Is this you / the correct payee?</p>
          <label className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={confirmedTick}
              onChange={e => { setConfirmedTick(e.target.checked); onValid(e.target.checked, { maskedInstrument: maskUpi(upiId), upiId }); }} />
            Confirm UPI ID
          </label>
        </div>
      )}
    </div>
  );
}
