import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../app/store/AppContext.jsx';
import { Input, PasswordInput, LoadingButton } from '../components/ui/controls.jsx';
import { Reveal } from '../components/ui/motion.jsx';
import { SmartImage } from '../components/ui/media.jsx';
import { IMAGES } from '../config/images.js';
import {
  CheckIcon,
  HotelIcon,
  GamepadIcon,
  ArrowRightIcon,
} from '../components/ui/icons.jsx';

// ---------------------------------------------------------------------------
// Auth screens — split-screen: brand panel (left) + form (right) on desktop,
// stacked on mobile. Inline field validation, show/hide password, loading
// buttons and success/error toasts.
// ---------------------------------------------------------------------------

function BrandPanel({ eyebrow, title, body, points, footnote, image }) {
  return (
    <aside className="relative overflow-hidden bg-navy-950 px-6 py-10 text-white sm:px-10 lg:py-14">
      {image && (
        <>
          {/* Calm corridor/garden photo behind the brand panel + scrim for contrast */}
          <SmartImage fill image={image} zoom={false} sizes="(min-width: 1024px) 50vw, 100vw" />
          <span aria-hidden className="absolute inset-0 bg-navy-950/80" />
        </>
      )}
      <div aria-hidden className="absolute inset-0 bg-grid-gold bg-[size:34px_34px] opacity-50" />
      <div aria-hidden className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="FRCC home">
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 font-display text-lg font-bold text-gold-400">F</span>
          <span className="leading-tight">
            <span className="block font-display font-bold text-white text-lg">FRCC</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-400">Club · Resort · Society</span>
          </span>
        </Link>

        <div className="mt-10 max-w-md">
          <p className="eyebrow-on-dark">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 text-slate-300 leading-relaxed">{body}</p>

          <ul className="mt-7 space-y-3 text-sm text-slate-200">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-500/20 text-gold-400">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-slate-400 lg:mt-auto">
          <span className="flex items-center gap-1.5">
            <HotelIcon className="h-4 w-4 text-gold-400" /> Hotel · Halls · Parking
          </span>
          <span className="flex items-center gap-1.5">
            <GamepadIcon className="h-4 w-4 text-gold-400" /> Courts · Pool · Bowling
          </span>
        </div>
        {footnote}
      </div>
    </aside>
  );
}

/** Split-screen shell shared by Sign up / Sign in. */
function AuthLayout({ brand, children }) {
  return (
    <div className="grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <BrandPanel {...brand} />
      <div className="flex items-center justify-center bg-cream px-4 py-10 sm:px-8">
        <Reveal className="w-full max-w-md">{children}</Reveal>
      </div>
    </div>
  );
}

export function SignupPage() {
  const { signup, pushToast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', emailOrPhone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!form.emailOrPhone.trim()) next.emailOrPhone = 'Enter your email or mobile number.';
    else if (form.emailOrPhone.trim().length < 4) next.emailOrPhone = 'That looks too short — check it once.';
    if (!form.password) next.password = 'Create a password.';
    else if (form.password.length < 6) next.password = 'Password must be at least 6 characters.';
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
    // TODO: POST /api/auth/signup + email/OTP verification; handle API errors below.
    setTimeout(() => {
      setBusy(false);
      signup(form);
      pushToast('Account created. Please sign in.');
      navigate('/signin');
    }, 600);
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
        <p className="eyebrow">Sign up</p>
        <h2 className="h-sub mt-1.5">Create account</h2>
        <p className="p-muted mt-1.5 text-sm">One account for hotel, halls, parking, games &amp; membership.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Full name"
            error={errors.name}
          />
          <Input
            label="Mail / Mobile"
            name="emailOrPhone"
            autoComplete="username"
            value={form.emailOrPhone}
            onChange={(e) => patch({ emailOrPhone: e.target.value })}
            placeholder="Email or mobile number"
            error={errors.emailOrPhone}
          />
          <PasswordInput
            label="Create Password"
            name="password"
            autoComplete="new-password"
            hint="At least 6 characters."
            value={form.password}
            onChange={(e) => patch({ password: e.target.value })}
            error={errors.password}
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

  // Form state - must be at top level for hooks rules
  const [form, setForm] = useState({ emailOrPhone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  // Resolve redirect target (memoized)
  const resolvedFrom = useMemo(() => {
    const candidates = [location.state?.from];
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
  }, [location.state?.from]);

  // Redirect logged-in users immediately (replace so no history entry).
  if (user) {
    navigate(resolvedFrom, { replace: true });
    return null;
  }

  function validate() {
    const next = {};
    if (!form.emailOrPhone.trim()) next.emailOrPhone = 'Enter your email or mobile number.';
    if (!form.password) next.password = 'Enter your password.';
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
    // TODO: POST /api/auth/login, handle invalid credentials + lockout.
    setTimeout(() => {
      setBusy(false);
      login({ name: form.emailOrPhone.split('@')[0] || 'Member', emailOrPhone: form.emailOrPhone });
      pushToast('Signed in');
      try {
        window.sessionStorage.removeItem('frcc.postLoginRedirect.v1');
      } catch {
        /* ignore */
      }
      navigate(resolvedFrom, { replace: true });
    }, 600);
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
        <p className="eyebrow">Sign in</p>
        <h2 className="h-sub mt-1.5">Welcome back</h2>
        <p className="p-muted mt-1.5 text-sm">Sign in to book &amp; manage membership.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Mail / Mobile"
            name="emailOrPhone"
            autoComplete="username"
            value={form.emailOrPhone}
            onChange={(e) => patch({ emailOrPhone: e.target.value })}
            placeholder="Email or mobile number"
            error={errors.emailOrPhone}
          />
          <PasswordInput
            label="Password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => patch({ password: e.target.value })}
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
            onClick={() => pushToast('Forgot password flow coming soon', 'error')}
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
