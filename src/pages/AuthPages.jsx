import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { Input, PasswordInput, LoadingButton } from '../components/ui/controls.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { Logo } from '../components/Logo.jsx';
import { ArrowRightIcon } from '../components/ui/icons.jsx';
import { IMAGES } from '../config/images.js';
import { isValidMobile, normalizeMobile, formatMobileDisplay, sanitizeMobileInput } from '../utils/phone.js';

// ---------------------------------------------------------------------------
// /signin & /signup — Public auth routes. Split-screen layout on desktop,
// stacked on mobile. Inline field validation, show/hide password, loading
// states, and friendly toast feedback.
// ---------------------------------------------------------------------------

function AuthLayout({ brand, children }) {
  return (
    <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src={brand.image}
          alt="Film Recreation and Cultural Centre"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative z-10">
          <Logo variant="lockup" size={120} />
          <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-gold-400">
            {brand.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-white">
            {brand.title}
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-300">
            {brand.body}
          </p>
        </div>

        <div className="relative z-10 space-y-3 border-t border-white/10 pt-8">
          {brand.points.map((pt) => (
            <div key={pt} className="flex items-center gap-3 text-sm text-slate-200">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gold-500/20 text-gold-400">
                ✓
              </span>
              <span>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Reveal className="w-full max-w-md">{children}</Reveal>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { user, signup, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  const handleFieldChange = (field, value) => {
    patch({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  function validate() {
    const next = {};
    if (!form.name.trim()) {
      next.name = 'Please enter your full name.';
    }
    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      next.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      next.email = 'Please enter a valid email address.';
    }
    const cleanMob = form.mobile.trim();
    if (!cleanMob) {
      next.mobile = 'Please enter your mobile number.';
    } else if (!isValidMobile(cleanMob)) {
      next.mobile = 'Enter a valid 10-digit mobile number starting with 6-9.';
    }
    if (!form.password) {
      next.password = 'Create a password.';
    } else if (form.password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (!form.confirmPassword) {
      next.confirmPassword = 'Please confirm your password.';
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    return next;
  }

  function submit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      pushToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy(true);
    signup({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: normalizeMobile(form.mobile),
      password: form.password,
    })
      .then(() => {
        setBusy(false);
        pushToast('Account created successfully! Welcome to FRCC.');
        const target = location.state?.from || '/home';
        navigate(target, { replace: true });
      })
      .catch((err) => {
        setBusy(false);
        const msg = String(err?.message || err).toLowerCase();
        if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('already registered')) {
          setErrors((prev) => ({ ...prev, email: 'An account with this email already exists. Please sign in.' }));
          pushToast('An account with this email already exists. Please sign in.', 'error');
        } else {
          pushToast(err?.message || 'Failed to create account. Please check your details.', 'error');
        }
      });
  }

  return (
    <AuthLayout
      brand={{
        image: IMAGES.authSignup,
        eyebrow: 'Join FRCC',
        title: 'Create one account for the whole campus.',
        body: 'Hotel, convention halls, parking, games and lifetime membership — all behind a single, secure login.',
        points: [
          'Book courts, pool and bowling in five steps',
          'Track every booking and payment in one dashboard',
          'Member rates, guest passes and a digital Member ID',
        ],
      }}
    >
      <div className="card p-6 sm:p-8">
        <div className="mb-5">
          <Logo variant="emblem" size={72} />
        </div>
        <p className="eyebrow">Sign up</p>
        <h2 className="h-sub mt-1.5">Create account</h2>
        <p className="p-muted mt-1.5 text-sm">One account for hotel, halls, parking, games &amp; membership.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Full Name *"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Your full name"
            error={errors.name}
          />
          <Input
            label="Email Address *"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="name@example.com"
            error={errors.email}
          />
          <Input
            label="Mobile Number *"
            name="mobile"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            value={form.mobile}
            onChange={(e) => handleFieldChange('mobile', sanitizeMobileInput(e.target.value))}
            placeholder="10-digit mobile number"
            hint={isValidMobile(form.mobile) ? `Display: ${formatMobileDisplay(form.mobile)}` : 'Accepts spaces, +91 or leading 0'}
            error={errors.mobile}
          />
          <PasswordInput
            label="Create Password *"
            name="password"
            autoComplete="new-password"
            hint="At least 6 characters."
            value={form.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            error={errors.password}
          />
          <PasswordInput
            label="Confirm Password *"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
          />

          <LoadingButton type="submit" className="w-full" loading={busy} loadingLabel="Creating account…">
            Create Account <ArrowRightIcon className="h-4 w-4" />
          </LoadingButton>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Have an account?{' '}
          <Link to="/signin" className="font-semibold text-navy-900 underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function SigninPage() {
  const { user, login, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  const handleFieldChange = (field, value) => {
    patch({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Resolve redirect target (memoized)
  const resolvedFrom = useMemo(() => {
    let queryFrom = null;
    try {
      queryFrom = new URLSearchParams(location?.search || '').get('from');
    } catch {
      /* ignore */
    }
    const candidates = [location?.state?.from, queryFrom];
    try {
      candidates.push(window.sessionStorage.getItem('frcc.postLoginRedirect.v1'));
    } catch {
      /* storage disabled */
    }
    for (const c of candidates) {
      if (
        typeof c === 'string'
        && c.startsWith('/')
        && !c.startsWith('//')
        && c !== '/'
        && !c.startsWith('/signin')
        && !c.startsWith('/signup')
        && !c.startsWith('/logout')
      ) {
        return c;
      }
    }
    return '/home';
  }, [location?.state?.from, location?.search]);

  // Redirect logged-in users safely inside useEffect (never during render)
  useEffect(() => {
    if (user) {
      navigate(resolvedFrom, { replace: true });
    }
  }, [user, resolvedFrom, navigate]);

  if (user) {
    return null;
  }

  function validate() {
    const next = {};
    const val = form.email.trim();
    const allowLegacy = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_LEGACY_PHONE_LOGIN === 'true';
    const isLegacy10Digits = allowLegacy && isValidMobile(val);

    if (!val) {
      next.email = allowLegacy ? 'Enter your email or 10-digit mobile.' : 'Enter your email address.';
    } else if (!isLegacy10Digits && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      next.email = allowLegacy ? 'Enter a valid email address or 10-digit mobile.' : 'Enter a valid email address.';
    }
    if (!form.password) {
      next.password = 'Enter your password.';
    }
    return next;
  }

  function mapAuthError(err) {
    if (!err) return 'An error occurred. Please try again.';
    const msg = String(err.message || err).toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Incorrect email or password. Please try again.';
    }
    if (msg.includes('user not found') || msg.includes('user_not_found')) {
      return 'No account found with this email. Please check your email or create an account.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Please confirm your email address before signing in. Check your inbox for the confirmation link.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'Too many login attempts. Please wait a few moments and try again.';
    }
    return err.message || 'Failed to sign in. Please check your credentials.';
  }

  function submit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      pushToast('Please fix the highlighted fields.', 'error');
      return;
    }
    setBusy(true);
    login({ email: form.email, password: form.password })
      .then(() => {
        setBusy(false);
        pushToast('Welcome back to FRCC!');
        try {
          window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');
        } catch {
          /* ignore */
        }
        navigate(resolvedFrom, { replace: true });
      })
      .catch((err) => {
        setBusy(false);
        pushToast(mapAuthError(err), 'error');
      });
  }

  async function handleForgotPassword() {
    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      pushToast('Please enter your email address above first.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      pushToast('Please enter a valid email address to reset your password.', 'error');
      return;
    }
    try {
      const { resetPassword } = await import('../services/authService.js');
      await resetPassword(cleanEmail);
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocalhost && !import.meta.env.VITE_SITE_URL) {
        pushToast('Reset link sent! Please open the email on THIS computer (localhost cannot be opened from another device).');
      } else {
        pushToast('Password reset instructions sent to your email.');
      }
    } catch (err) {
      pushToast(err?.message || 'Failed to send reset link.', 'error');
    }
  }

  return (
    <AuthLayout
      brand={{
        image: IMAGES.authSignin,
        eyebrow: 'Welcome back',
        title: 'Your campus, waiting where you left it.',
        body: 'Sign in to pick up bookings, view your Member ID and QR, and see payments and notifications.',
        points: [
          'Tonight’s open slots on courts, pool and lanes',
          'Booking IDs and payment history in one place',
          'Member-only rates on rooms, halls and parking',
        ],
      }}
    >
      <div className="card p-6 sm:p-8">
        <div className="mb-5">
          <Logo variant="emblem" size={72} />
        </div>
        <p className="eyebrow">Sign in</p>
        <h2 className="h-sub mt-1.5">Welcome back</h2>
        <p className="p-muted mt-1.5 text-sm">Sign in to book &amp; manage membership.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={form.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="name@example.com"
            error={errors.email}
          />
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            error={errors.password}
          />

          <LoadingButton type="submit" className="w-full" loading={busy} loadingLabel="Signing in…">
            Login <ArrowRightIcon className="h-4 w-4" />
          </LoadingButton>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="text-slate-500 underline underline-offset-4 hover:text-navy-900"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
          <Link to="/signup" className="font-semibold text-navy-900 underline underline-offset-4">
            Create account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}