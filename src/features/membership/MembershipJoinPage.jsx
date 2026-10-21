import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../app/store/AppContext.jsx';
import { FlowShell } from '../../components/FlowShell.jsx';
import { Card } from '../../components/ui/feedback.jsx';
import { Button, Input, Select, LoadingButton } from '../../components/ui/controls.jsx';
import { SmartImage } from '../../components/ui/media.jsx';
import { parseDMY } from '../../utils/dates.js';
import { IMAGES } from '../../config/images.js';
import {
  PLANS_DATA,
  WIZARD_STEPS,
  MARITAL_STATUSES,
  OCCUPATION_TYPES,
  CHILD_GENDER_OPTIONS,
  MEMBERSHIP_COPY,
} from '../../data/membership.js';
import { formatInr } from '../../utils/pricing.js';
import { initiateRazorpayPayment } from '../../services/razorpayService.js';
import {
  uploadPassportPhoto,
  getPassportPhotoSignedUrl,
  saveMemberProfileAndChildren,
} from '../../api/membership.js';

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

function formatDOBInput(value) {
  const raw = value.replace(/\D/g, '').slice(0, 8);
  if (raw.length > 4) {
    return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
  }
  if (raw.length > 2) {
    return `${raw.slice(0, 2)}/${raw.slice(2)}`;
  }
  return raw;
}

function validateOptionalDate(val) {
  if (!val) return null;
  if (val.length < 10) return 'Please enter a full date in DD/MM/YYYY format.';
  const iso = parseDMY(val);
  if (!iso) return 'Please enter a valid calendar date.';
  return null;
}

/**
 * Process passport photo:
 * - JPG or PNG, max 3 MB
 * - Min dimensions 300 x 400 px
 * - Redraw on 600 x 800 canvas with aspect-fill/cover
 * - JPEG quality 0.85 (removes EXIF)
 */
async function processPassportPhoto(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Please upload a JPG or PNG image.');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Photo size must not exceed 3 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        if (img.width < 300 || img.height < 400) {
          return reject(
            new Error(`Photo resolution must be at least 300 × 400 px (uploaded: ${img.width} × ${img.height} px).`)
          );
        }

        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        const targetRatio = 600 / 800;
        const imgRatio = img.width / img.height;
        let sWidth, sHeight, sx, sy;

        if (imgRatio > targetRatio) {
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 800);
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 600, 800);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas image processing failed.'));
            resolve({ blob, previewUrl: URL.createObjectURL(blob) });
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function MembershipJoinPage() {
  const { user, membership, saveMembership, pushToast } = useApp();
  const [searchParams] = useSearchParams();
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
      // Step 4: Family & Profession
      maritalStatus: '',
      spouseName: '',
      spouseDob: '',
      spouseMobile: '',
      hasNoChildren: false,
      children: [],
      occupationType: '',
      employerName: '',
      designation: '',
      workCity: '',
      workEmail: '',
      businessName: '',
      businessNature: '',
      profession: '',
      organisation: '',
      familyConsent: false,
      // Step 5: Documents
      photoPath: '',
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
      typeof saved?.step === 'number' && saved.step >= 0 && saved.step < 7 ? saved.step : 0;

    return { step: initialStep, formData: initialFormData };
  });

  const { step, formData } = wizardState;

  // In-memory file state (Passport photo & Aadhaar - NEVER stored in sessionStorage)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarRaw, setAadhaarRaw] = useState(() => {
    return formData.aadhaarLast4 ? `XXXX XXXX ${formData.aadhaarLast4}` : '';
  });
  const [isAadhaarFocused, setIsAadhaarFocused] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [paying, setPaying] = useState(false);
  const submittedRef = useRef(false);

  // TODO-REMOVE-TEST-COUPON
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Rebuild passport photo preview from storage path on initial load if present
  useEffect(() => {
    if (formData.photoPath && !photoPreviewUrl) {
      getPassportPhotoSignedUrl(formData.photoPath)
        .then((url) => {
          if (url) setPhotoPreviewUrl(url);
        })
        .catch((e) => console.warn('[MembershipJoinPage] Could not load photo signed URL:', e));
    }
  }, [formData.photoPath, photoPreviewUrl]);

  // TODO-REMOVE-TEST-COUPON: log when payment step is loaded
  useEffect(() => {
    if (step === 5) {
      console.info('[coupon] payment step loaded', { enabled: COUPON_ENABLED });
    }
  }, [step]);

  const [pdfError, setPdfError] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  async function handleDownloadForm() {
    setPdfError(null);
    setPdfBusy(true);
    try {
      const { downloadApplicationFormPdf } = await import('../../lib/applicationForm.js');
      await downloadApplicationFormPdf(confirmedMemberRecord);
    } catch (err) {
      console.error('[MembershipJoinPage] PDF build error:', err);
      setPdfError(err?.message || 'Failed to generate application form PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleSendWhatsApp() {
    setPdfError(null);
    setPdfBusy(true);
    try {
      const { sendMembershipToWhatsApp } = await import('../../lib/applicationForm.js');
      await sendMembershipToWhatsApp(confirmedMemberRecord);
    } catch (err) {
      console.error('[MembershipJoinPage] WhatsApp PDF send error:', err);
      setPdfError(err?.message || 'Failed to prepare application form for WhatsApp. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  // Sync wizard state to sessionStorage without file objects
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

  // Step 1 Validation (Plan)
  const isStep1Valid = Boolean(formData.planId);

  // Step 2 Validation (Registration)
  const isStep2Valid = useMemo(() => {
    return (
      Boolean(formData.fullName.trim()) &&
      /^\d{10}$/.test(formData.mobile.replace(/\D/g, '')) &&
      EMAIL_REGEX.test(formData.email.trim())
    );
  }, [formData.fullName, formData.mobile, formData.email]);

  // Step 3 Validation (Personal Details)
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

  // Step 4 Validation (Family and profession)
  const isStep4Valid = useMemo(() => {
    if (!formData.maritalStatus) return false;

    // Married checks
    if (formData.maritalStatus === 'Married') {
      if (!formData.spouseName.trim()) return false;
      if (formData.spouseDob && validateOptionalDate(formData.spouseDob)) return false;
      if (formData.spouseMobile && !/^\d{10}$/.test(formData.spouseMobile.replace(/\D/g, ''))) return false;
    }

    // Children checks for Married, Divorced, Widowed
    if (['Married', 'Divorced', 'Widowed'].includes(formData.maritalStatus)) {
      if (!formData.hasNoChildren) {
        if (!formData.children || formData.children.length === 0) return false;
        if (formData.children.length > 6) return false;
        const invalidChild = formData.children.some((c) => {
          if (!c.name || !c.name.trim()) return true;
          if (c.dob && validateOptionalDate(c.dob)) return true;
          return false;
        });
        if (invalidChild) return false;
      }
    }

    // Occupation checks
    if (!formData.occupationType) return false;
    if (formData.occupationType === 'Employed') {
      if (!formData.employerName.trim()) return false;
      if (!formData.designation.trim()) return false;
      if (formData.workEmail && !EMAIL_REGEX.test(formData.workEmail.trim())) return false;
    } else if (formData.occupationType === 'Self-employed') {
      if (!formData.businessName.trim()) return false;
    } else if (formData.occupationType === 'Professional') {
      if (!formData.profession.trim()) return false;
    }

    // Confirmation checkbox required
    if (!formData.familyConsent) return false;

    return true;
  }, [formData]);

  // Step 5 Validation (Documents: Passport photo + Aadhaar)
  const isStep5Valid = useMemo(() => {
    const hasPhoto = Boolean(formData.photoPath || photoPreviewUrl);
    const hasAadhaarDigits = Boolean(formData.aadhaarLast4 && formData.aadhaarLast4.length === 4);
    const hasAadhaarDoc = Boolean(aadhaarFile);
    const hasAadhaarConsent = Boolean(formData.aadhaarConsent);
    return hasPhoto && hasAadhaarDigits && hasAadhaarDoc && hasAadhaarConsent;
  }, [formData.photoPath, photoPreviewUrl, formData.aadhaarLast4, aadhaarFile, formData.aadhaarConsent]);

  // Pricing and coupon calculations
  const planBasePrice = selectedPlan?.price || selectedPlan?.amount || 0;
  // TODO-REMOVE-TEST-COUPON
  const discountAmount = (COUPON_ENABLED && appliedCoupon)
    ? Math.round((planBasePrice * (appliedCoupon.percent_off ?? 100)) / 100)
    : 0;
  // TODO-REMOVE-TEST-COUPON
  const finalPrice = Math.max(0, planBasePrice - discountAmount);

  // Step 6 Validation (Payment)
  const isStep6Valid = Boolean(formData.paymentMethod || finalPrice === 0);

  const isCurrentStepValid = useMemo(() => {
    if (step === 0) return isStep1Valid;
    if (step === 1) return isStep2Valid;
    if (step === 2) return isStep3Valid;
    if (step === 3) return isStep4Valid;
    if (step === 4) return isStep5Valid;
    if (step === 5) return isStep6Valid;
    return true;
  }, [step, isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid, isStep5Valid, isStep6Valid]);

  function handleNext() {
    if (!isCurrentStepValid) return;
    setFieldErrors({});
    setStep(Math.min(step + 1, 6));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleBack() {
    setFieldErrors({});
    setStep(Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // DOB Formatter DD/MM/YYYY for applicant
  function handleDOBChange(e) {
    const formatted = formatDOBInput(e.target.value);
    updateForm({ dob: formatted });
    if (formatted.length === 10) {
      const err = checkDOB(formatted);
      setFieldErrors((prev) => ({ ...prev, dob: err }));
    } else {
      setFieldErrors((prev) => ({ ...prev, dob: null }));
    }
  }

  // Passport photo selection & processing
  async function handlePhotoFile(file) {
    if (!file) return;
    setFieldErrors((prev) => ({ ...prev, photo: null }));
    setPhotoUploading(true);
    try {
      const { blob, previewUrl } = await processPassportPhoto(file);
      setPhotoPreviewUrl(previewUrl);

      // Upload directly to private bucket 'member-photos' at `<user_id>/photo.jpg`
      const uploadedPath = await uploadPassportPhoto(blob);
      updateForm({ photoPath: uploadedPath });
      pushToast('Passport photo uploaded successfully.');
    } catch (err) {
      console.error('[MembershipJoinPage] Photo processing/upload error:', err);
      setFieldErrors((prev) => ({
        ...prev,
        photo: err.message || 'Failed to process passport photo. Please try again.',
      }));
    } finally {
      setPhotoUploading(false);
    }
  }

  function handlePhotoFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
  }

  function handlePhotoDrop(e) {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoFile(file);
  }

  function handleRemovePhoto() {
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    updateForm({ photoPath: '' });
    setFieldErrors((prev) => ({ ...prev, photo: null }));
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

  // Aadhaar file upload handler
  function handleAadhaarFileUpload(e) {
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

  function handleRemoveAadhaarFile() {
    if (aadhaarFile?.previewUrl) {
      URL.revokeObjectURL(aadhaarFile.previewUrl);
    }
    setAadhaarFile(null);
  }

  // Children helpers (up to 6)
  function handleAddChild() {
    if (formData.children.length >= 6) return;
    const newChild = {
      id: `child-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      dob: '',
      gender: '',
    };
    updateForm({
      children: [...formData.children, newChild],
      hasNoChildren: false,
    });
  }

  function handleUpdateChild(index, patch) {
    const next = [...formData.children];
    next[index] = { ...next[index], ...patch };
    updateForm({ children: next });
  }

  function handleRemoveChild(index) {
    const next = formData.children.filter((_, i) => i !== index);
    updateForm({ children: next });
  }

  const confirmedMemberId = formData.memberId || membership?.memberId || '';
  const confirmedPlanName = selectedPlan?.name || membership?.planName || 'FRCC Membership';

  const confirmedMemberRecord = useMemo(() => {
    const emergencyContact =
      formData.emergencyName && formData.emergencyMobile
        ? `${formData.emergencyName} (${formData.emergencyMobile})`
        : (formData.emergencyMobile || formData.emergencyName || membership?.emergencyContact || '');
    const aadhaarMasked = formData.aadhaarLast4
      ? `XXXX XXXX ${formData.aadhaarLast4}`
      : (membership?.aadhaarMasked || '');

    return {
      memberId: confirmedMemberId,
      name: formData.fullName || user?.name || membership?.name || 'Member',
      mobile: formData.mobile || user?.phone || membership?.mobile || '',
      email: formData.email || user?.email || membership?.email || '',
      planName: confirmedPlanName,
      planPrice: planBasePrice,
      amountPaid: finalPrice,
      paymentMethod: formData.paymentMethod || membership?.paymentMethod || 'upi',
      couponCode: (COUPON_ENABLED && appliedCoupon) ? appliedCoupon.code : (membership?.couponCode || null),
      isTest: Boolean(appliedCoupon?.is_test || membership?.isTest),
      createdAt: membership?.createdAt || new Date().toISOString(),
      dateOfBirth: formData.dob || membership?.dateOfBirth || '',
      gender: formData.gender || membership?.gender || '',
      address: formData.address || membership?.address || '',
      addressLine: formData.address || membership?.addressLine || '',
      city: formData.city || membership?.city || '',
      state: formData.state || membership?.state || '',
      pincode: formData.pincode || membership?.pincode || '',
      emergencyContact,
      aadhaarMasked,
      maritalStatus: formData.maritalStatus || '',
      occupationType: formData.occupationType || '',
      photoPath: formData.photoPath || '',
    };
  }, [confirmedMemberId, confirmedPlanName, formData, user, membership, planBasePrice, finalPrice, appliedCoupon]);

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

  // Step 6 Payment submission
  async function handlePay() {
    if (finalPrice > 0 && !formData.paymentMethod) {
      setFieldErrors({ paymentMethod: 'Choose a payment method.' });
      return;
    }
    if (paying || submittedRef.current) return;
    submittedRef.current = true;
    setPaying(true);
    setSubmitError('');

    try {
      const year = new Date().getFullYear();
      const random6 = String(Math.floor(100000 + Math.random() * 900000));
      const memberId = formData.memberId || membership?.memberId || `FRCC-${year}-${random6}`;

      const emergencyContact =
        formData.emergencyName && formData.emergencyMobile
          ? `${formData.emergencyName} (${formData.emergencyMobile})`
          : (formData.emergencyMobile || formData.emergencyName || '');

      const aadhaarMasked = formData.aadhaarLast4
        ? `XXXX XXXX ${formData.aadhaarLast4}`
        : '';

      const finalizeEnrollment = async (paymentDetails = {}) => {
        // 1. Upsert member_profiles and replace member_children in Supabase
        await saveMemberProfileAndChildren(
          {
            marital_status: formData.maritalStatus || null,
            spouse_name: formData.maritalStatus === 'Married' ? formData.spouseName.trim() : null,
            spouse_dob: formData.maritalStatus === 'Married' ? formData.spouseDob.trim() : null,
            spouse_mobile: formData.maritalStatus === 'Married' ? formData.spouseMobile.replace(/\D/g, '') : null,
            occupation_type: formData.occupationType || null,
            employer_name: formData.occupationType === 'Employed' ? formData.employerName.trim() : null,
            designation: formData.occupationType === 'Employed' ? formData.designation.trim() : null,
            work_city: formData.occupationType === 'Employed' ? (formData.workCity.trim() || null) : null,
            work_email: formData.occupationType === 'Employed' ? (formData.workEmail.trim() || null) : null,
            business_name: formData.occupationType === 'Self-employed' ? formData.businessName.trim() : null,
            business_nature: formData.occupationType === 'Self-employed' ? (formData.businessNature.trim() || null) : null,
            profession: formData.occupationType === 'Professional' ? formData.profession.trim() : null,
            organisation: formData.occupationType === 'Professional' ? (formData.organisation.trim() || null) : null,
            photo_path: formData.photoPath || null,
          },
          formData.hasNoChildren ? [] : formData.children
        );

        // 2. Save membership record (memberships table)
        const record = {
          userId: user?.id || user?.userId || null,
          memberId,
          name: formData.fullName || user?.name || 'Member',
          mobile: formData.mobile || '',
          email: formData.email || '',
          planName: selectedPlan?.name || 'FRCC Membership',
          planPrice: planBasePrice,
          amountPaid: finalPrice,
          paymentMethod: finalPrice === 0 ? 'coupon' : (formData.paymentMethod || 'razorpay'),
          couponCode: (COUPON_ENABLED && appliedCoupon) ? appliedCoupon.code : null,
          isTest: Boolean(appliedCoupon?.is_test),
          paymentId: paymentDetails.paymentId || null,
          orderId: paymentDetails.orderId || null,
          signature: paymentDetails.signature || null,
          status: 'Active',
          createdAt: new Date().toISOString(),
          dateOfBirth: formData.dob || '',
          gender: formData.gender || '',
          address: formData.address || '',
          addressLine: formData.address || '',
          city: formData.city || '',
          state: formData.state || '',
          pincode: formData.pincode || '',
          emergencyContact,
          aadhaarMasked,
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
        setStep(6);
        setPaying(false);
      };

      // If price is 0 (100% coupon), finalize immediately
      if (finalPrice === 0) {
        await finalizeEnrollment();
        return;
      }

      // Launch Razorpay Payment Gateway
      await initiateRazorpayPayment({
        amount: finalPrice,
        planName: selectedPlan?.name || 'FRCC Membership',
        description: `${selectedPlan?.period || '1 Year'} Membership Subscription`,
        receiptId: memberId,
        prefill: {
          name: formData.fullName || user?.name || '',
          email: formData.email || user?.email || '',
          mobile: formData.mobile || user?.phone || '',
        },
        notes: {
          memberId,
          planId: selectedPlan?.id || '',
        },
        onSuccess: async (paymentDetails) => {
          await finalizeEnrollment(paymentDetails);
        },
        onDismiss: () => {
          submittedRef.current = false;
          setPaying(false);
        },
        onError: (err) => {
          console.error('[MembershipJoinPage] Razorpay payment error:', err);
          submittedRef.current = false;
          setPaying(false);
          setSubmitError(err?.message || 'Payment processing failed. Please try again.');
        },
      });
    } catch (err) {
      console.error('[MembershipJoinPage] Failed to save membership or process payment:', err);
      submittedRef.current = false;
      setPaying(false);
      setSubmitError(err?.message || 'Database error: ' + String(err));
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
        ...(formData.maritalStatus ? [{ label: 'Marital Status', value: formData.maritalStatus }] : []),
        ...(formData.occupationType ? [{ label: 'Occupation', value: formData.occupationType }] : []),
        ...(appliedCoupon ? [{ label: 'Coupon', value: `${appliedCoupon.code} (-${appliedCoupon.percent_off}%)` }] : []),
      ],
      price: planBasePrice,
      memberDiscount: discountAmount,
      total: finalPrice,
    };
  }, [selectedPlan, formData.fullName, formData.mobile, formData.maritalStatus, formData.occupationType, planBasePrice, discountAmount, finalPrice, appliedCoupon]);

  return (
    <FlowShell
      service="membership"
      title="Join FRCC"
      steps={WIZARD_STEPS.map((s) => s.title)}
      currentStep={step}
      onStepClick={(i) => {
        if (i < step && step < 6) {
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
                Next: Personal details
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
                Next: Family & profession
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 4: Family and profession */}
        {step === 3 && (
          <Card>
            <p className="eyebrow">Step 4 · Family and profession</p>
            <h2 className="h-sub mt-1">Family details & profession</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provide your marital status, dependents, and professional information.
            </p>

            <div className="mt-6 max-w-2xl space-y-6">
              {/* Marital Status Radio Cards */}
              <div>
                <label className="label">Marital Status *</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-2">
                  {MARITAL_STATUSES.map((status) => {
                    const isSelected = formData.maritalStatus === status.value;
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => {
                          updateForm({
                            maritalStatus: status.value,
                            ...(status.value === 'Single' ? {
                              spouseName: '',
                              spouseDob: '',
                              spouseMobile: '',
                              children: [],
                              hasNoChildren: true,
                            } : {}),
                          });
                        }}
                        className={`flex flex-col p-4 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-gold-500 bg-gold-50/40 ring-1 ring-gold-500'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-navy-900 text-sm">{status.label}</span>
                          <span
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-navy-900' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <span className="h-2 w-2 rounded-full bg-navy-900" />}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1">{status.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Married Conditional Fields */}
              {formData.maritalStatus === 'Married' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-navy-900">Spouse Details</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <Input
                        label="Spouse Name *"
                        id="fam-spouse-name"
                        name="spouseName"
                        value={formData.spouseName}
                        onChange={(e) => updateForm({ spouseName: e.target.value })}
                        placeholder="Spouse full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="fam-spouse-dob" className="label">
                        Spouse DOB (Optional)
                      </label>
                      <input
                        id="fam-spouse-dob"
                        name="spouseDob"
                        type="text"
                        maxLength="10"
                        placeholder="DD/MM/YYYY"
                        value={formData.spouseDob}
                        onChange={(e) => updateForm({ spouseDob: formatDOBInput(e.target.value) })}
                        className="field"
                      />
                      {formData.spouseDob && validateOptionalDate(formData.spouseDob) && (
                        <p role="alert" className="field-error mt-1">
                          {validateOptionalDate(formData.spouseDob)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="fam-spouse-mobile" className="label">
                        Spouse Mobile (Optional)
                      </label>
                      <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:border-navy-900 focus-within:ring-1 focus-within:ring-navy-900">
                        <span className="flex items-center bg-slate-50 px-3 text-xs font-semibold text-slate-600 border-r border-slate-200">
                          +91
                        </span>
                        <input
                          id="fam-spouse-mobile"
                          name="spouseMobile"
                          type="tel"
                          maxLength="10"
                          placeholder="10-digit mobile"
                          value={formData.spouseMobile}
                          onChange={(e) => updateForm({ spouseMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          className="field !border-0 !rounded-none focus:!ring-0 w-full"
                        />
                      </div>
                      {formData.spouseMobile && !/^\d{10}$/.test(formData.spouseMobile) && (
                        <p role="alert" className="field-error mt-1">
                          Mobile must be 10 digits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Children List for Married, Divorced, or Widowed */}
              {['Married', 'Divorced', 'Widowed'].includes(formData.maritalStatus) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-navy-900">Children Information</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Add up to 6 children or select no children</p>
                    </div>
                    {!formData.hasNoChildren && formData.children.length < 6 && (
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="btn-base px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-navy-900 rounded-lg inline-flex items-center gap-1 shadow-sm"
                      >
                        + Add child
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="fam-no-children"
                      checked={formData.hasNoChildren}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateForm({
                          hasNoChildren: checked,
                          children: checked ? [] : formData.children,
                        });
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-navy-900 accent-navy-900 cursor-pointer"
                    />
                    <label htmlFor="fam-no-children" className="text-sm font-medium text-slate-700 cursor-pointer">
                      No children
                    </label>
                  </div>

                  {!formData.hasNoChildren && (
                    <div className="space-y-3 pt-2">
                      {formData.children.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center bg-white">
                          <p className="text-xs text-slate-500">
                            No children added yet. Click &quot;+ Add child&quot; above or select &quot;No children&quot;.
                          </p>
                        </div>
                      ) : (
                        formData.children.map((child, idx) => (
                          <div
                            key={child.id || idx}
                            className="p-4 rounded-xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-sm"
                          >
                            <div className="sm:col-span-5">
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Child {idx + 1} Name *
                              </label>
                              <input
                                type="text"
                                value={child.name}
                                onChange={(e) => handleUpdateChild(idx, { name: e.target.value })}
                                placeholder="Child full name"
                                className="field !py-1.5 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                DOB (DD/MM/YYYY)
                              </label>
                              <input
                                type="text"
                                maxLength="10"
                                value={child.dob}
                                onChange={(e) => handleUpdateChild(idx, { dob: formatDOBInput(e.target.value) })}
                                placeholder="DD/MM/YYYY"
                                className="field !py-1.5 text-sm"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Gender
                              </label>
                              <select
                                value={child.gender}
                                onChange={(e) => handleUpdateChild(idx, { gender: e.target.value })}
                                className="field !py-1.5 text-sm"
                              >
                                <option value="">Select gender…</option>
                                {CHILD_GENDER_OPTIONS.map((g) => (
                                  <option key={g.value} value={g.value}>
                                    {g.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveChild(idx)}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                aria-label={`Remove child ${idx + 1}`}
                              >
                                <XIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Occupation Type */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <Select
                  label="Occupation Type *"
                  id="fam-occupation"
                  name="occupationType"
                  value={formData.occupationType}
                  onChange={(e) => updateForm({ occupationType: e.target.value })}
                  options={OCCUPATION_TYPES}
                  placeholder="Select your occupation…"
                  error={fieldErrors.occupationType}
                />

                {/* Conditional fields based on occupation type */}
                {formData.occupationType === 'Employed' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-navy-900">Employment Details</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Company / Employer Name *"
                        id="emp-company"
                        name="employerName"
                        value={formData.employerName}
                        onChange={(e) => updateForm({ employerName: e.target.value })}
                        placeholder="Company name"
                      />
                      <Input
                        label="Designation *"
                        id="emp-designation"
                        name="designation"
                        value={formData.designation}
                        onChange={(e) => updateForm({ designation: e.target.value })}
                        placeholder="Your job title / designation"
                      />
                      <Input
                        label="Work City (Optional)"
                        id="emp-work-city"
                        name="workCity"
                        value={formData.workCity}
                        onChange={(e) => updateForm({ workCity: e.target.value })}
                        placeholder="Work city"
                      />
                      <div>
                        <Input
                          label="Official Email (Optional)"
                          id="emp-work-email"
                          name="workEmail"
                          type="email"
                          value={formData.workEmail}
                          onChange={(e) => updateForm({ workEmail: e.target.value })}
                          placeholder="official@company.com"
                        />
                        {formData.workEmail && !EMAIL_REGEX.test(formData.workEmail.trim()) && (
                          <p role="alert" className="field-error mt-1">
                            Please enter a valid email address
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formData.occupationType === 'Self-employed' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-navy-900">Business Details</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Business Name *"
                        id="biz-name"
                        name="businessName"
                        value={formData.businessName}
                        onChange={(e) => updateForm({ businessName: e.target.value })}
                        placeholder="Trading / Enterprise name"
                      />
                      <Input
                        label="Nature of Business (Optional)"
                        id="biz-nature"
                        name="businessNature"
                        value={formData.businessNature}
                        onChange={(e) => updateForm({ businessNature: e.target.value })}
                        placeholder="e.g. Retail, Manufacturing, Hospitality"
                      />
                    </div>
                  </div>
                )}

                {formData.occupationType === 'Professional' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                    <h3 className="font-semibold text-sm text-navy-900">Professional Details</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Profession *"
                        id="prof-profession"
                        name="profession"
                        value={formData.profession}
                        onChange={(e) => updateForm({ profession: e.target.value })}
                        placeholder="e.g. Doctor, Lawyer, Architect, Chartered Accountant"
                      />
                      <Input
                        label="Organisation / Practice (Optional)"
                        id="prof-org"
                        name="organisation"
                        value={formData.organisation}
                        onChange={(e) => updateForm({ organisation: e.target.value })}
                        placeholder="Hospital, Chamber, or Practice name"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Required confirmation checkbox */}
              <div className="border-t border-slate-100 pt-5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="fam-consent"
                    checked={formData.familyConsent}
                    onChange={(e) => updateForm({ familyConsent: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-900 accent-navy-900 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {MEMBERSHIP_COPY.familyConsent} *
                  </span>
                </label>
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
                Next: Documents
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 5: Documents (Passport photo & Aadhaar verification) */}
        {step === 4 && (
          <Card>
            <p className="eyebrow">Step 5 · Verification Documents</p>
            <h2 className="h-sub mt-1">Passport photograph & Aadhaar</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload your member photograph and identity documentation for ID card issuing.
            </p>

            <div className="mt-6 max-w-xl space-y-8">
              {/* Passport Photo Upload with 3:4 Framing Guide */}
              <div>
                <label className="label">Member Passport Photograph (3:4 ratio) *</label>
                <p className="text-xs text-slate-500 mb-3">{MEMBERSHIP_COPY.passportPhotoNotice}</p>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPhoto(true);
                  }}
                  onDragLeave={() => setIsDraggingPhoto(false)}
                  onDrop={handlePhotoDrop}
                  className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition ${
                    isDraggingPhoto
                      ? 'border-gold-500 bg-gold-50/30'
                      : 'border-slate-300 bg-slate-50/60 hover:border-gold-500/60'
                  }`}
                >
                  {photoPreviewUrl ? (
                    <div className="flex flex-col items-center gap-4">
                      {/* 3:4 aspect framing guide with preview */}
                      <div className="relative w-44 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden border-2 border-gold-500 shadow-md bg-navy-950">
                        <img
                          src={photoPreviewUrl}
                          alt="Passport photograph preview"
                          className="h-full w-full object-cover"
                        />
                        {/* 3:4 Framing guideline overlay */}
                        <div className="absolute inset-0 border border-white/40 rounded-lg m-2 pointer-events-none" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor="passport-photo-replace"
                          className="btn-base px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 text-navy-900 hover:bg-slate-50 cursor-pointer rounded-lg shadow-sm"
                        >
                          Replace photo
                          <input
                            id="passport-photo-replace"
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={handlePhotoFileSelect}
                            className="sr-only"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="btn-base px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      {photoUploading && (
                        <p className="text-xs text-gold-700 font-medium animate-pulse">
                          Uploading photo to secure storage…
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-20 aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white">
                        <ImageIcon className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-[10px] font-bold tracking-wider">3 : 4</span>
                      </div>
                      <div>
                        <label
                          htmlFor="passport-photo-upload"
                          className="relative cursor-pointer rounded-md font-semibold text-navy-900 hover:text-gold-600 focus-within:outline-none text-sm"
                        >
                          <span>Upload passport photograph</span>
                          <input
                            id="passport-photo-upload"
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={handlePhotoFileSelect}
                            className="sr-only"
                          />
                        </label>
                        <p className="text-xs text-slate-500 mt-1">or drag and drop here (JPG or PNG up to 3 MB)</p>
                      </div>
                      <p className="text-[11px] text-slate-400">Minimum resolution: 300 × 400 pixels</p>
                    </div>
                  )}
                </div>
                {fieldErrors.photo && (
                  <p role="alert" className="field-error mt-1">
                    {fieldErrors.photo}
                  </p>
                )}
              </div>

              {/* Aadhaar Verification Section */}
              <div className="border-t border-slate-200 pt-6 space-y-5">
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

                {/* Aadhaar File upload */}
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
                              onChange={handleAadhaarFileUpload}
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
                        onClick={handleRemoveAadhaarFile}
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

                {/* Aadhaar consent checkbox */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.aadhaarConsent}
                      onChange={(e) => updateForm({ aadhaarConsent: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-900 accent-navy-900"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {MEMBERSHIP_COPY.aadhaarConsent}
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 pl-6">
                    {MEMBERSHIP_COPY.aadhaarConsentNote}
                  </p>
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
                disabled={!isStep5Valid}
                onClick={handleNext}
                className="px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
              >
                Next: Payment
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 6: Payment */}
        {step === 5 && (
          <Card>
            <p className="eyebrow">Step 6 · Payment</p>
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
                disabled={!isStep6Valid || paying}
                className="px-8 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
              >
                {/* TODO-REMOVE-TEST-COUPON */}
                {finalPrice === 0 ? 'Complete membership' : `Pay now (${formatInr(finalPrice)})`}
              </LoadingButton>
            </div>
          </Card>
        )}

        {/* STEP 7: Confirmation */}
        {step === 6 && (
          <Card className="text-center !p-6 sm:!p-10 max-w-4xl mx-auto">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircleIcon className="h-10 w-10" />
            </div>

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

            {/* Action buttons: Download cards, Download application form, Send to WhatsApp */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => downloadBothCards(confirmedMemberId)}
                className="btn-base border-2 border-navy-900 bg-white text-navy-900 hover:bg-navy-50 px-6 py-2.5 font-semibold text-sm rounded-xl transition shadow-sm"
              >
                Download cards
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={handleDownloadForm}
                className="btn-base bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-60 px-6 py-2.5 font-semibold text-sm rounded-xl transition shadow-sm"
              >
                {pdfBusy ? 'Generating PDF…' : 'Download application form'}
              </button>
              <button
                type="button"
                disabled={pdfBusy}
                onClick={handleSendWhatsApp}
                className="btn-base bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 px-6 py-2.5 font-semibold text-sm rounded-xl transition shadow-sm"
              >
                Send to WhatsApp
              </button>
            </div>

            {pdfError && (
              <div className="mt-4 mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
                <span>{pdfError}</span>
                <button
                  type="button"
                  onClick={() => setPdfError(null)}
                  className="text-xs font-semibold text-red-800 hover:underline ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="mt-4">
              <Link
                to="/membership/dashboard"
                className="text-sm font-semibold text-navy-900 hover:text-gold-600 underline underline-offset-4 inline-block"
              >
                Go to my membership
              </Link>
            </div>
          </Card>
        )}
      </div>
    </FlowShell>
  );
}

export default MembershipJoinPage;
