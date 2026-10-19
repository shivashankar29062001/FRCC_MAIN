import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useBooking } from '../context/BookingContext';
import Stepper from '../components/Stepper';
import { inr } from '../utils/format';
import * as pay from '../services/payment';
import UpiIdFlow from '../components/payment/UpiIdFlow';
import UpiAppPicker from '../components/payment/UpiAppPicker';
import UpiQrFlow from '../components/payment/UpiQrFlow';
import CardForm from '../components/payment/CardForm';
import NetBankingPicker from '../components/payment/NetBankingPicker';
import WalletPicker from '../components/payment/WalletPicker';
import EmiPicker from '../components/payment/EmiPicker';
import PayLaterPicker from '../components/payment/PayLaterPicker';
import BankTransferForm from '../components/payment/BankTransferForm';
import CorporateForm from '../components/payment/CorporateForm';
import AdvanceForm from '../components/payment/AdvanceForm';

const GROUPS = [
  { title: 'UPI', methods: [
    { id: 'UPI_ID', name: 'UPI ID' }, { id: 'UPI_APP', name: 'UPI Apps' }, { id: 'UPI_QR', name: 'UPI QR Code' },
  ]},
  { title: 'Cards', methods: [
    { id: 'CREDIT_CARD', name: 'Credit Card' }, { id: 'DEBIT_CARD', name: 'Debit Card' },
  ]},
  { title: 'Net Banking', methods: [{ id: 'NETBANKING', name: 'Net Banking' }] },
  { title: 'Wallets', methods: [{ id: 'WALLET', name: 'Wallets' }] },
  { title: 'EMI & Pay Later', methods: [
    { id: 'EMI_CREDIT', name: 'Credit Card EMI' }, { id: 'EMI_NO_COST', name: 'No-Cost EMI', minTotal: 10000 },
    { id: 'EMI_DEBIT', name: 'Debit Card EMI' }, { id: 'PAY_LATER', name: 'Pay Later' },
  ]},
  { title: 'Bank Transfer', methods: [{ id: 'BANK_TRANSFER', name: 'NEFT / RTGS / IMPS' }] },
  { title: 'Venue / Corporate', methods: [
    { id: 'ADVANCE_PAY_AT_VENUE', name: 'Advance + Pay at Venue' }, { id: 'CORPORATE_INVOICE', name: 'Corporate / Invoice' },
  ]},
];

const FEE = { WALLET: 9 };
const CARD_METHODS = ['CREDIT_CARD', 'DEBIT_CARD'];
const NO_OTP_INSTANT = ['BANK_TRANSFER', 'CORPORATE_INVOICE'];
const TEST_OTP = '123456';

// Helper: find which group a method belongs to
function findGroup(methodId) {
  for (const g of GROUPS) {
    if (g.methods.some(m => m.id === methodId)) return g.title;
  }
  return null;
}

export default function ConventionPayment() {
  const { booking, setConfirmed } = useBooking();
  const navigate = useNavigate();
  const [hall, setHall] = useState(null);
  
  // SINGLE SOURCE OF TRUTH: selectedMethod
  const [selectedMethod, setSelectedMethod] = useState('UPI_ID');
  // Derive open groups from selectedMethod - no separate open state
  const openGroups = Object.fromEntries(
    GROUPS.map(g => [g.title, g.methods.some(m => m.id === selectedMethod)])
  );
  
  const [forms, setForms] = useState({}); // method -> { valid, data }
  const [phase, setPhase] = useState('idle'); // idle | processing | failed
  const [error, setError] = useState('');
  const [forceFail, setForceFail] = useState(false);
  const [hold, setHold] = useState(600);
  const [expired, setExpired] = useState(false);
  const [otp, setOtp] = useState(null); // {attempts, resendIn}
  const [showTest, setShowTest] = useState(false);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!booking.hallId) { navigate('/convention/book'); return; }
    api('/halls', { auth: false }).then(d => setHall(d.halls.find(h => h.id === booking.hallId) || null)).catch(() => {});
  }, [booking.hallId]);

  useEffect(() => {
    const t = setInterval(() => setHold(h => {
      if (h <= 1) { setExpired(true); clearInterval(t); return 0; }
      return h - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = booking.startTime && booking.endTime
    ? (Number(booking.endTime.split(':')[0]) * 60 + Number(booking.endTime.split(':')[1]) - Number(booking.startTime.split(':')[0]) * 60 - Number(booking.startTime.split(':')[1])) / 60
    : 0;
  const hallCharge = hall && hours > 0 ? Math.round(hours * hall.pricePerHour) : 0;
  const gst = Math.round(hallCharge * 0.18);
  const fee = FEE[selectedMethod] || 0;
  const total = hallCharge + gst + fee;

  const formValid = forms[selectedMethod]?.valid;
  const activeData = forms[selectedMethod]?.data || {};
  const advanceData = selectedMethod === 'ADVANCE_PAY_AT_VENUE' ? activeData : null;

  const setForm = (method) => (valid, data) => setForms(f => ({ ...f, [method]: { valid, data: data || {} } }));

  const selectMethod = (id) => {
    if (id === selectedMethod) return;
    setSelectedMethod(id);
    setPhase('idle');
    setError('');
    setOtp(null);
  };

  const createBooking = async (extra) => {
    const data = await api('/bookings', {
      method: 'POST',
      body: {
        hallId: booking.hallId, date: booking.date, startTime: booking.startTime, endTime: booking.endTime,
        guests: Number(booking.guests), eventType: booking.eventType, eventDetails: booking.eventDetails,
        organizerName: booking.organizerName, phone: booking.phone, email: booking.email,
        specialRequests: booking.specialRequests,
        convenienceFee: fee, paymentMethod: selectedMethod,
        paymentStatus: extra.paymentStatus,
        amountPaid: extra.amountPaid, balanceDue: extra.balanceDue,
        maskedInstrument: extra.maskedInstrument, upiIdMasked: extra.maskedInstrument,
        transactionRef: extra.transactionRef,
        emiTenure: extra.emiTenure, emiMonthlyAmount: extra.emiMonthlyAmount,
        gstin: extra.gstin, utrNumber: extra.utrNumber,
        venueName: hall?.venueName, area: hall?.area, city: hall?.city,
        hallName: hall?.name, cityName: hall?.cityName, areaName: hall?.areaName,
      },
    });
    return data.booking;
  };

  const withTimeout = (p, ms = 15000) => Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Payment timed out after 15 seconds. Please try again.')), ms)),
  ]);

  const finish = async () => {
    if (phase === 'processing') return;
    setPhase('processing'); setError('');
    let ref = '';
    try {
      const instant = NO_OTP_INSTANT.includes(selectedMethod);
      ref = 'TXN' + Date.now();
      pay.setForceFailure(forceFail);
      if (!instant) {
        const r = await withTimeout(pay.initiatePayment(selectedMethod, activeData));
        ref = r.ref;
      } else {
        ref = await withTimeout(pay.initiatePayment(selectedMethod, activeData).then(r => r.ref));
      }

      const mapStatus = selectedMethod === 'ADVANCE_PAY_AT_VENUE' ? 'PARTIAL' : instant ? 'PENDING_VERIFICATION' : 'PAID';
      const bookingPayload = {
        maskedInstrument: activeData.maskedInstrument || '',
        paymentStatus: mapStatus,
        transactionRef: ref,
        amountPaid: advanceData?.advance != null ? advanceData.advance : instant ? 0 : total,
        balanceDue: advanceData?.balanceDue != null ? advanceData.balanceDue : instant ? total : 0,
        emiTenure: activeData.emiTenure || null, emiMonthlyAmount: activeData.emiMonthlyAmount || null,
        gstin: activeData.gstin || null, utrNumber: activeData.utrNumber || null,
      };

      const created = await withTimeout(createBooking(bookingPayload));
      pendingRef.current = null;
      setConfirmed(created);
      navigate('/convention/confirmation');
    } catch (e) {
      console.error('Payment flow error:', e);
      setPhase('failed');
      if (ref && !/timed out/i.test(e.message || '')) {
        pendingRef.current = { ref, method: selectedMethod, amount: total };
        setError(`Payment received but booking failed. Your reference is ${ref}. Please contact support to complete the booking or request a refund.`);
      } else {
        setError(e.message || 'Something went wrong. Please try again.');
      }
    }
  };

  const onPay = () => {
    if (CARD_METHODS.includes(selectedMethod)) {
      setOtp({ attempts: 0, resendIn: 30 });
      return;
    }
    finish();
  };

  useEffect(() => {
    if (!otp || otp.resendIn <= 0) return;
    const t = setTimeout(() => setOtp(o => o && { ...o, resendIn: o.resendIn - 1 }), 1000);
    return () => clearTimeout(t);
  }, [otp]);

  const mm = Math.floor(hold / 60), ss = String(hold % 60).padStart(2, '0');

  // Render form for a specific method - inline inside the group
  const renderMethodForm = (methodId) => {
    if (selectedMethod !== methodId) return null;
    
    switch (methodId) {
      case 'UPI_ID': return <UpiIdFlow onValid={setForm('UPI_ID')} />;
      case 'UPI_APP': return <UpiAppPicker onValid={setForm('UPI_APP')} />;
      case 'UPI_QR': return <UpiQrFlow amount={total} onValid={setForm('UPI_QR')} />;
      case 'CREDIT_CARD': return <CardForm kind="credit" onValid={setForm('CREDIT_CARD')} />;
      case 'DEBIT_CARD': return <CardForm kind="debit" onValid={setForm('DEBIT_CARD')} />;
      case 'NETBANKING': return <NetBankingPicker onValid={setForm('NETBANKING')} />;
      case 'WALLET': return <WalletPicker onValid={setForm('WALLET')} />;
      case 'EMI_CREDIT': return <EmiPicker amount={total} kind="emi_credit" onValid={setForm('EMI_CREDIT')} />;
      case 'EMI_NO_COST': return total >= 10000 ? <EmiPicker amount={total} kind="emi_no_cost" onValid={setForm('EMI_NO_COST')} /> : <p className="text-gray-500">No-Cost EMI is available on totals above ₹10,000.</p>;
      case 'EMI_DEBIT': return <EmiPicker amount={total} kind="emi_debit" onValid={setForm('EMI_DEBIT')} />;
      case 'PAY_LATER': return <PayLaterPicker amount={total} onValid={setForm('PAY_LATER')} />;
      case 'BANK_TRANSFER': return <BankTransferForm bookingRef={booking.id || 'FRCC'} onValid={setForm('BANK_TRANSFER')} />;
      case 'CORPORATE_INVOICE': return <CorporateForm onValid={setForm('CORPORATE_INVOICE')} />;
      case 'ADVANCE_PAY_AT_VENUE': return <AdvanceForm total={total} onValid={setForm('ADVANCE_PAY_AT_VENUE')} />;
      default: return null;
    }
  };

  const payNowAmount = selectedMethod === 'ADVANCE_PAY_AT_VENUE' 
    ? (activeData?.advance ?? Math.round(total * 0.25)) 
    : total;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Stepper current={3} />
      <h1 className="text-3xl mb-2">Step 4: Payment</h1>
      <p className={`mb-6 font-semibold ${hold < 120 ? 'text-red-600' : 'text-navy'}`}>🔒 Slot held for {mm}:{ss} — complete payment before it expires.</p>

      {/* Test mode banner */}
      <div className="mb-6 border-2 border-amber-400 bg-amber-50 rounded p-3 text-sm text-amber-800">
        <strong>Test mode</strong> — payments are simulated. Use the values below to demo success and failure.
      </div>

      <button type="button" onClick={() => setShowTest(s => !s)}
        className="mb-4 text-sm text-navy underline flex items-center gap-1">
        {showTest ? '▾' : '▸'} Test payment details
      </button>
      {showTest && (
        <div className="mb-6 bg-white border border-amber-300 rounded p-4 text-sm space-y-2">
          <p className="font-semibold">Test UPI IDs</p>
          <ul className="list-disc ml-5 text-gray-700">
            <li><code className="font-mono">success@frcc</code> — verifies, holder name "Test User"</li>
            <li><code className="font-mono">fail@frcc</code> — verification fails</li>
            <li>Any other valid-format UPI ID verifies with a mock name</li>
          </ul>
          <p className="font-semibold mt-2">Test cards (Luhn valid)</p>
          <ul className="list-disc ml-5 text-gray-700 font-mono">
            <li>Visa 4111 1111 1111 1111</li>
            <li>Mastercard 5555 5555 5555 4444</li>
            <li>RuPay 6521 6521 6521 6521</li>
            <li>Amex 3782 822463 10005</li>
            <li>Declined: 4000 0000 0000 0002</li>
          </ul>
          <p className="font-semibold mt-2">Test OTP</p>
          <p><code className="font-mono">123456</code> succeeds; anything else fails (3 attempts max). Any future expiry, any CVV.</p>
        </div>
      )}

      {forceFail && <p className="text-amber-600 text-sm mb-4">Test mode: the next payment will be forced to FAIL.</p>}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {GROUPS.map(g => {
            const isOpen = openGroups[g.title];
            return (
              <div key={g.title} className="bg-white rounded shadow">
                <button 
                  type="button" 
                  className="w-full flex justify-between items-center px-4 py-3 font-semibold text-navy"
                  onClick={() => {
                    // Clicking group header selects the first available method in that group
                    const firstAvailable = g.methods.find(m => {
                      if (m.minTotal && total < m.minTotal) return false;
                      return true;
                    });
                    if (firstAvailable) selectMethod(firstAvailable.id);
                  }}
                >
                  <span>{g.title}</span>
                  <span className="flex items-center gap-2">
                    {isOpen && <span className="text-gold font-semibold text-sm">● Selected</span>}
                    <span>{isOpen ? '−' : '+'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    {g.methods.map(m => {
                      const disabledMin = m.minTotal && total < m.minTotal;
                      const isSelected = selectedMethod === m.id;
                      return (
                        <label 
                          key={m.id} 
                          className={`border rounded px-4 py-3 cursor-pointer transition-colors flex items-center gap-3 ${
                            isSelected ? 'border-gold bg-amber-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                          } ${disabledMin ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <input 
                            type="radio" 
                            name="method" 
                            className="mr-2 h-4 w-4 text-gold border-gray-300 focus:ring-gold"
                            checked={isSelected} 
                            disabled={disabledMin}
                            onChange={() => !disabledMin && selectMethod(m.id)} 
                          />
                          <span className="flex-1">{m.name}{disabledMin ? ' (min ₹10,000)' : ''}</span>
                          {isSelected && <span className="text-gold font-semibold text-sm">Selected</span>}
                        </label>
                      );
                    })}
                    
                    {/* Form renders INSIDE the group, directly under the selected method */}
                    {g.methods.map(m => (
                      <div key={`form-${m.id}`} className="ml-6 mt-2 border-l-2 border-gray-100 pl-4">
                        {renderMethodForm(m.id)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="bg-white rounded shadow p-5">
            {error && <p className="text-red-600 mt-3">{error}</p>}
            {pendingRef.current && (
              <div className="mt-3 border border-amber-400 bg-amber-50 rounded p-3 text-sm text-amber-800">
                Payment received but booking failed. Your reference is <strong>{pendingRef.current.ref}</strong>.
                You have not been charged again — contact support to complete the booking or request a refund.
              </div>
            )}
            {phase === 'failed' && (
              <div className="mt-3 flex gap-3">
                <button type="button" onClick={() => finish()} className="bg-navy text-gold rounded px-4 py-2">Retry</button>
                <button type="button" onClick={() => { setPhase('idle'); setError(''); setOtp(null); }} className="border border-navy text-navy rounded px-4 py-2">Change Method</button>
              </div>
            )}
            <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={forceFail} onChange={e => { setForceFail(e.target.checked); pay.setForceFailure(e.target.checked); }} />
                Force next payment to fail (testing)
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/convention/details')} className="border border-navy text-navy px-6 py-2 rounded">← Back</button>
                <button type="button" onClick={onPay} disabled={!formValid || phase === 'processing'}
                  className="bg-navy text-gold px-8 py-2 rounded font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                  {phase === 'processing' ? 'Processing…' : NO_OTP_INSTANT.includes(selectedMethod) ? 'Submit for Verification' : `Pay Now ${inr(payNowAmount)}`}
                </button>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 flex items-center gap-2">🔒 100% secure payment • Visa • Mastercard • RuPay • Amex • UPI • Net Banking</p>
            {selectedMethod === 'CREDIT_CARD' && <p className="text-xs text-gray-500 mt-1">International cards accepted.</p>}
          </div>
        </div>

        <aside className="bg-white rounded shadow p-5 h-fit">
          <h3 className="text-xl mb-3">Order Summary</h3>
          <p className="text-sm text-gray-600">{hall?.name} • {booking.venueName || hall?.venueName || '—'} • {booking.area || hall?.area || '—'} • {booking.city || hall?.city || '—'}<br />{booking.date}<br />{booking.startTime}–{booking.endTime} • {booking.guests} guests</p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Hall charge</span><span>{inr(hallCharge)}</span></div>
            <div className="flex justify-between"><span>GST (18%)</span><span>{inr(gst)}</span></div>
            {fee > 0 && <div className="flex justify-between"><span>Convenience fee</span><span>{inr(fee)}</span></div>}
            <hr />
            <div className="flex justify-between font-bold text-navy"><span>Total</span><span>{inr(total)}</span></div>
            {selectedMethod === 'ADVANCE_PAY_AT_VENUE' && activeData?.advance != null && (
              <>
                <div className="flex justify-between text-green-700"><span>Advance now</span><span>{inr(activeData.advance)}</span></div>
                <div className="flex justify-between text-amber-700"><span>Due at venue</span><span>{inr(activeData.balanceDue)}</span></div>
              </>
            )}
            {(selectedMethod === 'BANK_TRANSFER' || selectedMethod === 'CORPORATE_INVOICE') && (
              <p className="text-amber-700">Booking will be pending verification until payment is confirmed.</p>
            )}
          </div>
        </aside>
      </div>

      {phase === 'processing' && (
        <div className="fixed inset-0 bg-navy-900/60 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 flex items-center gap-3">
            <span className="inline-block w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            Processing payment… please do not click again.
          </div>
        </div>
      )}

      {expired && (
        <div className="fixed inset-0 bg-navy-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 max-w-sm text-center">
            <h3 className="text-xl mb-2">Slot hold expired</h3>
            <p className="text-sm text-gray-600 mb-4">Your 10-minute hold has ended. Please choose your date and slot again.</p>
            <button onClick={() => navigate('/convention/date')} className="bg-navy text-gold rounded px-6 py-2 font-semibold">Choose a new slot</button>
          </div>
        </div>
      )}

      {otp && (
        <div className="fixed inset-0 bg-navy-900/70 flex items-center justify-center z-50 p-4">
          <form className="bg-white rounded p-6 max-w-sm w-full" onSubmit={(e) => {
            e.preventDefault();
            const v = String(e.target.otp.value || '').trim();
            if (v === TEST_OTP) { setOtp(null); finish(); }
            else {
              const a = otp.attempts + 1;
              if (a >= 3) { setOtp(null); setPhase('failed'); setError('OTP failed 3 times. Please retry or change method.'); }
              else setOtp({ ...otp, attempts: a });
            }
          }}>
            <h3 className="text-xl mb-2">3D Secure / OTP Verification</h3>
            <p className="text-sm text-gray-600 mb-1">Enter the 6-digit OTP sent to your registered mobile.</p>
            <p className="text-xs text-amber-600 mb-3">Test mode OTP: <strong>{TEST_OTP}</strong> (attempt {otp.attempts + 1}/3)</p>
            <input name="otp" inputMode="numeric" maxLength={6} className="border rounded p-2 w-full mb-3" placeholder="••••••" />
            {otp.attempts > 0 && <p className="text-red-600 text-sm mb-3">Incorrect OTP. Try again.</p>}
            <div className="flex justify-between items-center">
              <button type="button" disabled={otp.resendIn > 0}
                onClick={() => setOtp({ attempts: 0, resendIn: 30 })}
                className="text-sm text-navy underline disabled:text-gray-400 disabled:no-underline">
                {otp.resendIn > 0 ? `Resend in ${otp.resendIn}s` : 'Resend OTP'}
              </button>
              <button className="bg-navy text-gold rounded px-5 py-2 font-semibold">Verify</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}