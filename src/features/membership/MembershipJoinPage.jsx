import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { parseDMY } from '../../utils/dates.js';
import { IMAGES } from '../../config/images.js';
import { PLANS_DATA } from '../../data/membership.js';
import { formatInr } from '../../utils/pricing.js';

// TODO-REMOVE-TEST-COUPON
const COUPON_ENABLED = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_TEST_COUPON !== 'false';
import {
  MembershipIdCard,
  HealthCard,
  downloadBothCards,
} from './MembershipCards.jsx';
import {
  CheckIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ArrowRightIcon,
  XIcon,
  ImageIcon,
} from '../../components/ui/icons.jsx';

const STORAGE_KEY = 'frcc.membershipJoin.v1';

const STEPS = [
  { id: 'plan', title: 'Plan' },
  { id: 'registration', title: 'Registration' },
  { id: 'personal', title: 'Personal Details' },
  { id: 'aadhaar', title: 'Aadhaar' },
  { id: 'payment', title: 'Payment' },
  { id: 'confirmation', title: 'Confirmation' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Delhi',
  'Kerala',
  'Gujarat',
  'Rajasthan',
  'West Bengal',
  'Other',
].map((s) => ({ value: s, label: s }));

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkDOB(dobStr) {
  if (!dobStr || dobStr.length < 10) return 'Date of birth is required in DD/MM/YYYY format.';
  const iso = parseDMY(dobStr);
  if (!iso) return 'Please enter a valid calendar date.';
  const [y, m, d] = iso.split('-').map(Number);
  const birthDate = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const mDiff = today.getMonth() - birthDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  if (age < 18) return 'You must be at least 18 years old to apply for membership.';
  if (age > 110) return 'Please check the year of birth.';
  return null;
}

export function MembershipJoinPage() {
  const { user, membership, saveMembership, pushToast } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planParam = (searchParams.get('plan') || searchParams.get('item') || '').toLowerCase();

  // Initialize wizard state from sessionStorage or defaults
  const [wizardState, setWizardState] = useState(() => {
    let saved = null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const matchedPlan = PLANS_DATA.find((p) => p.id === planParam);
    const initialPlanId = matchedPlan ? matchedPlan.id : (saved?.formData?.planId || 'frcc-membership');

    let initialFullName = user?.name || '';
    let initialEmail = '';
    let initialMobile = '';
    const contact = user?.emailOrPhone || user?.email || user?.mobile || '';
    if (contact.includes('@')) {
      initialEmail = contact.trim();
    } else if (contact) {
      initialMobile = contact.replace(/\D/g, '').slice(-10);
    }

    const initialFormData = {
      planId: initialPlanId,
      fullName: initialFullName,
      mobile: initialMobile,
      email: initialEmail,
      dob: '',
      gender: '',
      address: '',
      city: '',
      state: 'Telangana',
      pincode: '',
      emergencyName: '',
      emergencyMobile: '',
      aadhaarLast4: '',
      aadhaarConsent: false,
      paymentMethod: 'upi',
      memberId: saved?.formData?.memberId || membership?.memberId || '',
      ...(saved?.formData || {}),
    };

    if (matchedPlan) {
      initialFormData.planId = matchedPlan.id;
    }

    if (!initialFormData.fullName && user?.name) initialFormData.fullName = user.name;
    if (!initialFormData.email && initialEmail) initialFormData.email = initialEmail;
    if (!initialFormData.mobile && initialMobile) initialFormData.mobile = initialMobile;
    if (!initialFormData.memberId && membership?.memberId) initialFormData.memberId = membership.memberId;

    const initialStep =
      typeof saved?.step === 'number' && saved.step >= 0 && saved.step < 6 ? saved.step : 0;

    return { step: initialStep, formData: initialFormData };
  });

  const { step, formData } = wizardState;

  // In-memory file state (NEVER in sessionStorage)
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarRaw, setAadhaarRaw] = useState(() => {
    return formData.aadhaarLast4 ? `XXXX XXXX ${formData.aadhaarLast4}` : '';
  });
  const [isAadhaarFocused, setIsAadhaarFocused] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [paying, setPaying] = useState(false);
  const submittedRef = useRef(false); // Idempotency guard to prevent duplicate submissions

  // TODO-REMOVE-TEST-COUPON
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // TODO-REMOVE-TEST-COUPON: log when payment step is loaded
  useEffect(() => {
    if (step === 4) {
      console.info('[coupon] payment step loaded', { enabled: COUPON_ENABLED });
    }
  }, [step]);

  // Sync wizard state to sessionStorage (without file)
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          formData: {
            ...formData,
            aadhaarLast4: formData.aadhaarLast4 ? String(formData.aadhaarLast4).slice(-4) : '',
          },
        })
      );
    } catch {
      /* ignore */
    }
  }, [step, formData]);

  function updateForm(patch) {
    setWizardState((prev) => ({
      ...prev,
      formData: { ...prev.formData, ...patch },
    }));
  }

  function setStep(newStep) {
    setWizardState((prev) => ({
      ...prev,
      step: newStep,
    }));
  }

  const selectedPlan = useMemo(
    () => PLANS_DATA.find((p) => p.id === formData.planId) || PLANS_DATA[0],
    [formData.planId]
  );

  // Step 1 Validation
  const isStep1Valid = Boolean(formData.planId);

  // Step 2 Validation
  const isStep2Valid = useMemo(() => {
    return (
      Boolean(formData.fullName.trim()) &&
      /^\d{10}$/.test(formData.mobile.replace(/\D/g, '')) &&
      EMAIL_REGEX.test(formData.email.trim())
    );
  }, [formData.fullName, formData.mobile, formData.email]);

  // Step 3 Validation
  const isStep3Valid = useMemo(() => {
    return (
      checkDOB(formData.dob) === null &&
      Boolean(formData.gender) &&
      Boolean(formData.address.trim()) &&
      Boolean(formData.city.trim()) &&
      Boolean(formData.state.trim()) &&
      /^\d{6}$/.test(formData.pincode.replace(/\D/g, '')) &&
      Boolean(formData.emergencyName.trim()) &&
      /^\d{10}$/.test(formData.emergencyMobile.replace(/\D/g, ''))
    );
  }, [
    formData.dob,
    formData.gender,
    formData.address,
    formData.city,
    formData.state,
    formData.pincode,
    formData.emergencyName,
    formData.emergencyMobile,
  ]);

  // Step 4 Validation
  const isStep4Valid = useMemo(() => {
    return (
      Boolean(formData.aadhaarLast4 && formData.aadhaarLast4.length === 4) &&
      Boolean(aadhaarFile) &&
      Boolean(formData.aadhaarConsent)
    );
  }, [formData.aadhaarLast4, aadhaarFile, formData.aadhaarConsent]);

  // Pricing and coupon calculations
  const planBasePrice = selectedPlan?.price || selectedPlan?.amount || 0;
  // TODO-REMOVE-TEST-COUPON
  const discountAmount = (COUPON_ENABLED && appliedCoupon)
    ? Math.round((planBasePrice * (appliedCoupon.percent_off ?? 100)) / 100)
    : 0;
  // TODO-REMOVE-TEST-COUPON
  const finalPrice = Math.max(0, planBasePrice - discountAmount);

  // Step 5 Validation
  const isStep5Valid = Boolean(formData.paymentMethod || finalPrice === 0);

  const isCurrentStepValid = useMemo(() => {
    if (step === 0) return isStep1Valid;
    if (step === 1) return isStep2Valid;
    if (step === 2) return isStep3Valid;
    if (step === 3) return isStep4Valid;
    if (step === 4) return isStep5Valid;
    return true;
  }, [step, isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid, isStep5Valid]);

  function handleNext() {
    if (!isCurrentStepValid) return;
    setFieldErrors({});
    setStep(Math.min(step + 1, 5));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleBack() {
    setFieldErrors({});
    setStep(Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // DOB Formatter DD/MM/YYYY
  function handleDOBChange(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    updateForm({ dob: formatted });
    if (formatted.length === 10) {
      const err = checkDOB(formatted);
      setFieldErrors((prev) => ({ ...prev, dob: err }));
    } else {
      setFieldErrors((prev) => ({ ...prev, dob: null }));
    }
  }

  // Aadhaar input handler
  function handleAadhaarChange(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setAadhaarRaw(formatted);
    if (raw.length === 12) {
      updateForm({ aadhaarLast4: raw.slice(8) });
      setFieldErrors((prev) => ({ ...prev, aadhaar: null }));
    } else {
      updateForm({ aadhaarLast4: '' });
      if (raw.length > 0) {
        setFieldErrors((prev) => ({ ...prev, aadhaar: 'Aadhaar number must be 12 digits.' }));
      }
    }
  }

  function handleAadhaarFocus() {
    setIsAadhaarFocused(true);
    if (aadhaarRaw.startsWith('XXXX')) {
      setAadhaarRaw('');
    }
  }

  function handleAadhaarBlur() {
    setIsAadhaarFocused(false);
    if (formData.aadhaarLast4) {
      setAadhaarRaw(`XXXX XXXX ${formData.aadhaarLast4}`);
    }
  }

  // File upload handler (mock, in-memory only)
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'Please upload a JPG, PNG, or PDF file.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        file: 'File size must not exceed 5 MB.',
      }));
      return;
    }

    let previewUrl = null;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    setAadhaarFile({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type,
      previewUrl,
    });
    setFieldErrors((prev) => ({ ...prev, file: null }));
  }

  function handleRemoveFile() {
    if (aadhaarFile?.previewUrl) {
      URL.revokeObjectURL(aadhaarFile.previewUrl);
    }
    setAadhaarFile(null);
  }

  const confirmedMemberId = formData.memberId || membership?.memberId || '';
  const confirmedPlanName =
    selectedPlan?.name || membership?.planName || 'FRCC Membership';

  // TODO-REMOVE-TEST-COUPON
  async function handleApplyCoupon() {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setValidatingCoupon(true);
    try {
      const { validateCoupon } = await import('../../services/couponService.js');
      const res = await validateCoupon(code);
      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError('');
        pushToast(`Coupon ${res.code} applied (${res.percent_off}% off)!`);
      } else {
        setCouponError(res.error || 'Invalid or expired coupon code.');
      }
    } catch (err) {
      setCouponError(err?.message || 'Error validating coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  }

  // TODO-REMOVE-TEST-COUPON
  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  }

  // Step 5 Payment submission
  async function handlePay() {
    if (finalPrice > 0 && !formData.paymentMethod) {
      setFieldErrors({ paymentMethod: 'Choose a payment method.' });
      return;
    }
    // Idempotency: prevent duplicate submissions on double click or refresh
    if (paying || submittedRef.current) return;
    submittedRef.current = true;
    setPaying(true);
    setSubmitError('');

    try {
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const memberId = formData.memberId || membership?.memberId || `FRCC-${year}-${random6}`;

      // Store safe fields: user id, member id, plan, status "active", amount_paid, payment_method, coupon_code, is_test
      // Never store full Aadhaar number or file
      const record = {
        userId: user?.id || user?.userId || null,
        memberId,
        name: formData.fullName || user?.name || 'Member',
        mobile: formData.mobile || '',
        email: formData.email || '',
        planName: selectedPlan?.name || 'FRCC Membership',
        planPrice: planBasePrice,
        amountPaid: finalPrice, // TODO-REMOVE-TEST-COUPON
        paymentMethod: finalPrice === 0 ? 'coupon' : (formData.paymentMethod || 'upi'), // TODO-REMOVE-TEST-COUPON
        couponCode: (COUPON_ENABLED && appliedCoupon) ? appliedCoupon.code : null, // TODO-REMOVE-TEST-COUPON
        isTest: Boolean(appliedCoupon?.is_test), // TODO-REMOVE-TEST-COUPON
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const saved = await saveMembership(record);
      const insertedId = saved?.id || saved?.memberId || memberId;
      console.info('[membership] inserted row id:', insertedId);

      updateForm({ memberId });
      pushToast(
        finalPrice === 0
          ? `Welcome to ${selectedPlan?.name || 'FRCC'}! Test coupon membership activated.`
          : `Payment verified! Welcome to ${selectedPlan?.name || 'FRCC'} Membership.`
      );
      setStep(5);
    } catch (err) {
      console.error('Failed to save membership:', err);
      submittedRef.current = false;
      setSubmitError(err?.message || 'Failed to save membership to database. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  const joinSummary = useMemo(() => {
    return {
      name: selectedPlan ? `${selectedPlan.name} Membership` : 'Membership Plan',
      image: selectedPlan ? IMAGES[selectedPlan.imageSlot] || { slot: selectedPlan.imageSlot } : null,
      detail: selectedPlan ? selectedPlan.period : '',
      details: [
        ...(formData.fullName ? [{ label: 'Applicant', value: formData.fullName }] : []),
        ...(selectedPlan ? [{ label: 'Plan', value: `${selectedPlan.name} (${selectedPlan.period})` }] : []),
        ...(formData.mobile ? [{ label: 'Mobile', value: `+91 ${formData.mobile}` }] : []),
        ...(appliedCoupon ? [{ label: 'Coupon', value: `${appliedCoupon.code} (-${appliedCoupon.percent_off}%)` }] : []),
      ],
      price: planBasePrice,
      memberDiscount: discountAmount,
      total: finalPrice,
    };
  }, [selectedPlan, formData.fullName, formData.mobile, planBasePrice, discountAmount, finalPrice, appliedCoupon]);

  return (
    <FlowShell
      service="membership"
      title="Join FRCC"
      steps={STEPS.map((s) => s.title)}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 5) {
          setFieldErrors({});
          setStep(i);
        }
      }}
      summary={joinSummary}
    >
      <div>
        {/* STEP 1: Select Plan */}
        {step === 0 && (
            <Card>
              <div className="text-center max-w-xl mx-auto">
                <p className="eyebrow">Step 1 · Membership Plan</p>
                <h2 className="h-sub mt-1">FRCC Membership</h2>
                <p className="mt-1 text-sm text-slate-600">
                  One lifetime membership for booking discounts, diagnostic centre health card savings, and club privileges.
                </p>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="w-full max-w-lg">
                  {(() => {
                    const plan = PLANS_DATA[0];
                    const img = IMAGES[plan.imageSlot] || IMAGES.serviceMembership || { slot: plan.imageSlot };
                    return (
                      <article className="flex flex-col overflow-hidden rounded-2xl border-2 border-gold-500 bg-gold-50/15 ring-1 ring-gold-500/40 shadow-card">
                        <SmartImage image={img} aspect="16 / 9" sizes="(min-width: 1024px) 38vw, 92vw" />
                        <div className="flex flex-1 flex-col p-6">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-2xl font-bold text-navy-900">{plan.name}</h3>
                            <span className="tag tag-gold !px-3 !py-1 !text-xs font-semibold">
                              Lifetime Membership
                            </span>
                          </div>
                          <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-display text-3xl font-bold text-navy-900">
                              {formatInr(plan.price || plan.amount)}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">one-time lifetime fee</span>
                          </div>

                          <ul className="mt-6 flex-1 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-700">
                            {plan.benefits.map((b, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                                <span className="font-medium">{b}</span>
                              </li>
                            ))}
                          </ul>

                          {plan.healthCardNote && (
                            <p className="mt-4 rounded-lg bg-amber-50/80 border border-amber-200/60 p-2.5 text-xs text-amber-900 font-medium">
                              {plan.healthCardNote}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end border-t border-slate-100 pt-5">
                <Button
                  variant="primary"
                  disabled={!isStep1Valid}
                  onClick={handleNext}
                  className="px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 2: Registration */}
          {step === 1 && (
            <Card>
              <p className="eyebrow">Step 2 · Registration</p>
              <h2 className="h-sub mt-1">Your account information</h2>
              <p className="mt-1 text-sm text-slate-600">
                Prefilled from your account. Please review your name, mobile, and email.
              </p>

              <div className="mt-6 max-w-xl space-y-5">
                <Input
                  label="Full Name *"
                  id="reg-fullname"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => {
                    updateForm({ fullName: e.target.value });
                    if (e.target.value.trim()) {
                      setFieldErrors((prev) => ({ ...prev, fullName: null }));
                    }
                  }}
                  placeholder="Full name as per official ID"
                  error={fieldErrors.fullName}
                />

                <div>
                  <label htmlFor="reg-mobile" className="label">
                    Mobile Number *
                  </label>
                  <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-navy-900 focus-within:ring-1 focus-within:ring-navy-900">
                    <span className="flex items-center bg-slate-50 px-3.5 text-sm font-semibold text-slate-600 border-r border-slate-200">
                      +91
                    </span>
                    <input
                      id="reg-mobile"
                      name="mobile"
                      type="tel"
                      maxLength="10"
                      placeholder="10-digit mobile number"
                      value={formData.mobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        updateForm({ mobile: val });
                        if (val.length === 10) {
                          setFieldErrors((prev) => ({ ...prev, mobile: null }));
                        }
                      }}
                      className="field !border-0 !rounded-none focus:!ring-0 w-full"
                    />
                  </div>
                  {fieldErrors.mobile && (
                    <p role="alert" className="field-error mt-1">
                      {fieldErrors.mobile}
                    </p>
                  )}
                </div>

                <Input
                  label="Email Address *"
                  id="reg-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    updateForm({ email: e.target.value });
                    if (EMAIL_REGEX.test(e.target.value.trim())) {
                      setFieldErrors((prev) => ({ ...prev, email: null }));
                    }
                  }}
                  placeholder="name@example.com"
                  error={fieldErrors.email}
                />
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <Button
                  variant="primary"
                  disabled={!isStep2Valid}
                  onClick={handleNext}
                  className="px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  Next: Personal Details
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 3: Personal Details */}
          {step === 2 && (
            <Card>
              <p className="eyebrow">Step 3 · Personal Details</p>
              <h2 className="h-sub mt-1">Address & Emergency Contact</h2>
              <p className="mt-1 text-sm text-slate-600">
                All fields are required. Applicants must be at least 18 years old.
              </p>

              <div className="mt-6 max-w-2xl space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pers-dob" className="label">
                      Date of Birth (DD/MM/YYYY) *
                    </label>
                    <input
                      id="pers-dob"
                      name="dob"
                      type="text"
                      maxLength="10"
                      placeholder="DD/MM/YYYY"
                      value={formData.dob}
                      onChange={handleDOBChange}
                      className="field"
                      aria-invalid={!!fieldErrors.dob}
                    />
                    {fieldErrors.dob && (
                      <p role="alert" className="field-error mt-1">
                        {fieldErrors.dob}
                      </p>
                    )}
                  </div>

                  <Select
                    label="Gender *"
                    id="pers-gender"
                    name="gender"
                    value={formData.gender}
                    onChange={(e) => updateForm({ gender: e.target.value })}
                    options={GENDER_OPTIONS}
                    placeholder="Select gender…"
                    error={fieldErrors.gender}
                  />
                </div>

                <Input
                  label="Address Line *"
                  id="pers-address"
                  name="address"
                  value={formData.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  placeholder="Flat/House no., Building, Street address"
                  error={fieldErrors.address}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <Input
                    label="City *"
                    id="pers-city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => updateForm({ city: e.target.value })}
                    placeholder="City"
                    error={fieldErrors.city}
                  />

                  <Select
                    label="State *"
                    id="pers-state"
                    name="state"
                    value={formData.state}
                    onChange={(e) => updateForm({ state: e.target.value })}
                    options={INDIAN_STATES}
                    placeholder="Select state…"
                    error={fieldErrors.state}
                  />

                  <div>
                    <label htmlFor="pers-pincode" className="label">
                      Pincode (6 digits) *
                    </label>
                    <input
                      id="pers-pincode"
                      name="pincode"
                      type="text"
                      maxLength="6"
                      placeholder="6-digit pincode"
                      value={formData.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        updateForm({ pincode: val });
                      }}
                      className="field"
                    />
                    {fieldErrors.pincode && (
                      <p role="alert" className="field-error mt-1">
                        {fieldErrors.pincode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-sm text-navy-900">Emergency Contact</h3>
                  <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Input
                      label="Contact Person Name *"
                      id="pers-emg-name"
                      name="emergencyName"
                      value={formData.emergencyName}
                      onChange={(e) => updateForm({ emergencyName: e.target.value })}
                      placeholder="Name of emergency contact"
                      error={fieldErrors.emergencyName}
                    />

                    <div>
                      <label htmlFor="pers-emg-mobile" className="label">
                        Emergency Mobile *
                      </label>
                      <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-navy-900 focus-within:ring-1 focus-within:ring-navy-900">
                        <span className="flex items-center bg-slate-50 px-3.5 text-sm font-semibold text-slate-600 border-r border-slate-200">
                          +91
                        </span>
                        <input
                          id="pers-emg-mobile"
                          name="emergencyMobile"
                          type="tel"
                          maxLength="10"
                          placeholder="10-digit mobile number"
                          value={formData.emergencyMobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            updateForm({ emergencyMobile: val });
                          }}
                          className="field !border-0 !rounded-none focus:!ring-0 w-full"
                        />
                      </div>
                      {fieldErrors.emergencyMobile && (
                        <p role="alert" className="field-error mt-1">
                          {fieldErrors.emergencyMobile}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <Button
                  variant="primary"
                  disabled={!isStep3Valid}
                  onClick={handleNext}
                  className="px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  Next: Aadhaar
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 4: Aadhaar Verification */}
          {step === 3 && (
            <Card>
              <p className="eyebrow">Step 4 · Identity Verification</p>
              <h2 className="h-sub mt-1">Aadhaar verification</h2>
              <p className="mt-1 text-sm text-slate-600">
                Provide your 12-digit Aadhaar number and document copy for verification.
              </p>

              <div className="mt-6 max-w-xl space-y-6">
                <div>
                  <label htmlFor="aadhaar-number" className="label">
                    Aadhaar Number (12 digits) *
                  </label>
                  <input
                    id="aadhaar-number"
                    type="text"
                    maxLength="14"
                    placeholder="XXXX XXXX 1234"
                    value={
                      isAadhaarFocused
                        ? aadhaarRaw
                        : formData.aadhaarLast4
                        ? `XXXX XXXX ${formData.aadhaarLast4}`
                        : aadhaarRaw
                    }
                    onChange={handleAadhaarChange}
                    onFocus={handleAadhaarFocus}
                    onBlur={handleAadhaarBlur}
                    className="field font-mono text-base tracking-wider"
                    aria-invalid={!!fieldErrors.aadhaar}
                  />
                  {fieldErrors.aadhaar && (
                    <p role="alert" className="field-error mt-1">
                      {fieldErrors.aadhaar}
                    </p>
                  )}
                  {formData.aadhaarLast4 && (
                    <p className="text-xs text-emerald-700 font-medium mt-1">
                      ✓ Aadhaar ending in {formData.aadhaarLast4} recorded (only last 4 digits stored).
                    </p>
                  )}
                </div>

                {/* File upload */}
                <div>
                  <label className="label">Aadhaar Document Copy (JPG, PNG, PDF max 5 MB) *</label>
                  {!aadhaarFile ? (
                    <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-slate-300 px-6 pt-5 pb-6 text-center hover:border-gold-500/60 bg-slate-50/50">
                      <div className="space-y-2">
                        <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label
                            htmlFor="aadhaar-file-upload"
                            className="relative cursor-pointer rounded-md font-semibold text-navy-900 hover:text-gold-600 focus-within:outline-none"
                          >
                            <span>Upload Aadhaar document</span>
                            <input
                              id="aadhaar-file-upload"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                              onChange={handleFileUpload}
                              className="sr-only"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">Image or PDF up to 5 MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        {aadhaarFile.previewUrl ? (
                          <img
                            src={aadhaarFile.previewUrl}
                            alt="Aadhaar preview"
                            className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center rounded-lg bg-navy-50 text-navy-900 text-xs font-bold uppercase shrink-0">
                            PDF
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy-900">{aadhaarFile.name}</p>
                          <p className="text-xs text-slate-500">{aadhaarFile.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        aria-label="Remove uploaded document"
                      >
                        <XIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  {fieldErrors.file && (
                    <p role="alert" className="field-error mt-1">
                      {fieldErrors.file}
                    </p>
                  )}
                </div>

                {/* Consent checkbox and note */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.aadhaarConsent}
                      onChange={(e) => updateForm({ aadhaarConsent: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-900 accent-navy-900"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      I agree to share my Aadhaar for membership verification *
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 pl-6">
                    Your details are used only for membership verification.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <Button
                  variant="primary"
                  disabled={!isStep4Valid}
                  onClick={handleNext}
                  className="px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  Next: Payment
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 5: Payment */}
          {step === 4 && (
            <Card>
              <p className="eyebrow">Step 5 · Payment</p>
              <h2 className="h-sub mt-1">Review & Complete Payment</h2>
              <p className="mt-1 text-sm text-slate-600">
                Select your payment method and confirm your lifetime membership order.
              </p>

              <div className="mt-6 max-w-xl space-y-6">
                {/* Order Summary */}
                <div className="rounded-2xl border border-slate-200 bg-navy-50/50 p-5 sm:p-6">
                  <h3 className="font-display text-lg font-bold text-navy-900">Order Summary</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Plan</span>
                      <span className="font-semibold text-navy-900">
                        {selectedPlan.name} Membership ({selectedPlan.period})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Plan Fee</span>
                      <span className="font-semibold text-navy-900">
                        {/* TODO-REMOVE-TEST-COUPON */}
                        {appliedCoupon ? (
                          <span className="line-through text-slate-400 font-normal">{formatInr(planBasePrice)}</span>
                        ) : (
                          formatInr(planBasePrice)
                        )}
                      </span>
                    </div>
                    {/* TODO-REMOVE-TEST-COUPON */}
                    {appliedCoupon ? (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Coupon discount ({appliedCoupon.percent_off}%)</span>
                        <span className="text-emerald-700 font-semibold">-{formatInr(discountAmount)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Member Discount</span>
                        <span className="text-emerald-700 font-medium">{formatInr(0)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200/80 pt-3 flex justify-between items-center">
                      <span className="font-bold text-navy-900 text-base">Total Amount</span>
                      <span className="font-display text-2xl font-bold text-navy-900">
                        {formatInr(finalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* TODO-REMOVE-TEST-COUPON */}
                  {COUPON_ENABLED && (
                    <div className="mt-4 border-t border-slate-200/60 pt-4">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 border border-emerald-200 text-sm">
                          <span className="text-emerald-900 font-medium">
                            Coupon <strong className="font-mono">{appliedCoupon.code}</strong> applied ({appliedCoupon.percent_off}% off)
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-xs font-semibold text-rose-600 underline hover:text-rose-800 cursor-pointer ml-3"
                          >
                            Remove
                          </button>
                        </div>
                      ) : showCouponInput ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponError('');
                                setSubmitError('');
                              }}
                              placeholder="Enter coupon code"
                              className="field text-sm uppercase flex-1"
                              disabled={validatingCoupon}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={validatingCoupon || !couponInput.trim()}
                              className="btn-base px-4 py-2 bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 disabled:opacity-50 cursor-pointer"
                            >
                              {validatingCoupon ? 'Checking…' : 'Apply'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCouponInput(false);
                                setCouponError('');
                              }}
                              className="px-2 text-xs text-slate-500 hover:text-navy-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                          {couponError && (
                            <p className="text-xs text-rose-600 font-medium">{couponError}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCouponInput(true)}
                          className="text-sm font-semibold text-gold-700 hover:text-gold-800 underline underline-offset-4 cursor-pointer"
                        >
                          Have a coupon?
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Database error banner if submission fails */}
                {submitError && (
                  <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
                    <p className="font-semibold">Unable to complete membership</p>
                    <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
                  </div>
                )}

                {/* Payment Methods */}
                {/* TODO-REMOVE-TEST-COUPON */}
                {finalPrice === 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                    <p className="font-semibold">No payment required</p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      100% coupon discount applied. Click Complete membership below to activate your account.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="label">Select Payment Method *</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-2">
                      {[
                        { id: 'upi', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm' },
                        { id: 'card', label: 'Card', hint: 'Credit or Debit cards' },
                        { id: 'netbanking', label: 'Net Banking', hint: 'All major banks' },
                      ].map((m) => {
                        const active = formData.paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => updateForm({ paymentMethod: m.id })}
                            className={`flex flex-col text-left p-4 rounded-xl border transition cursor-pointer ${
                              active
                                ? 'border-gold-500 bg-gold-50/40 ring-1 ring-gold-500'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-semibold text-navy-900 text-sm">{m.label}</span>
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                  active ? 'border-navy-900' : 'border-slate-300'
                                }`}
                              >
                                {active && <span className="h-2 w-2 rounded-full bg-navy-900" />}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 mt-1">{m.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={paying}
                  onClick={handleBack}
                  className="btn-base border border-slate-300 bg-white text-navy-900 hover:bg-slate-50 px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Back
                </button>
                <LoadingButton
                  variant="gold"
                  loading={paying}
                  loadingLabel={finalPrice === 0 ? 'Activating membership…' : 'Processing payment…'}
                  onClick={handlePay}
                  disabled={!isStep5Valid || paying}
                  className="px-8 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
                >
                  {/* TODO-REMOVE-TEST-COUPON */}
                  {finalPrice === 0 ? 'Complete membership' : `Pay now (${formatInr(finalPrice)})`}
                </LoadingButton>
              </div>
            </Card>
          )}

          {/* STEP 6: Confirmation */}
          {step === 5 && (
            <Card className="text-center !p-6 sm:!p-10 max-w-4xl mx-auto">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircleIcon className="h-10 w-10" />
              </div>

              {/* Success line, plan name, member ID */}
              <h2 className="font-display text-2xl font-bold text-navy-900 mt-4">
                Membership confirmed
              </h2>
              <p className="mt-1 text-base font-semibold text-gold-600">
                {confirmedPlanName}
              </p>
              <p className="mt-1 font-mono text-sm text-slate-700">
                Member ID: <span className="font-bold text-navy-900">{confirmedMemberId}</span>
              </p>

              {/* Both Cards: Membership ID Card & FRCC Health Card */}
              <div className="my-8 grid gap-8 lg:grid-cols-2 text-left">
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-xs font-bold tracking-wider text-navy-800 uppercase">
                    Membership ID Card
                  </p>
                  <MembershipIdCard
                    id="frcc-membership-id-card"
                    member={{
                      memberId: confirmedMemberId,
                      name: formData.fullName || user?.name || membership?.name || 'Member',
                      planName: confirmedPlanName,
                      createdAt: membership?.createdAt || new Date().toISOString(),
                    }}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-xs font-bold tracking-wider text-navy-800 uppercase">
                    FRCC Health Card
                  </p>
                  <HealthCard
                    id="frcc-health-card"
                    member={{
                      memberId: confirmedMemberId,
                      name: formData.fullName || user?.name || membership?.name || 'Member',
                      planName: confirmedPlanName,
                      createdAt: membership?.createdAt || new Date().toISOString(),
                    }}
                  />
                </div>
              </div>

              {/* Action buttons: Outline "Download cards" button & Plain link "Go to my membership" */}
              <div className="mt-8 flex flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => downloadBothCards(confirmedMemberId)}
                  className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 px-8 py-3 font-semibold text-sm rounded-xl transition shadow-sm"
                >
                  Download cards
                </button>

                <div className="mt-2">
                  <Link
                    to="/membership/dashboard"
                    className="text-sm font-semibold text-navy-900 hover:text-gold-600 underline underline-offset-4 inline-block"
                  >
                    Go to my membership
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </FlowShell>
    );
  }

export default MembershipJoinPage;
