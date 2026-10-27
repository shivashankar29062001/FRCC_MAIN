import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { useAuthModal } from '../context/AuthModalContext.jsx';
import { requireSignIn } from '../../config/site.js';

// Protects gated routes: requires sign-in.
const POST_LOGIN_REDIRECT_KEY = 'frcc.postLoginRedirect.v1';

function isSafeRedirect(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && value !== '/'
    && !value.startsWith('/signin')
    && !value.startsWith('/signup')
    && !value.startsWith('/logout');
}

// Maps gated routes to matching public service pages
function getPublicFallback(pathname) {
  if (pathname.startsWith('/book/hotel') || pathname.startsWith('/book/stay') || pathname.startsWith('/stay/book')) {
    return '/stay';
  }
  if (pathname.startsWith('/dining/book') || pathname.startsWith('/book/dining')) {
    return '/dining';
  }
  if (pathname.startsWith('/halls/book') || pathname.startsWith('/book/hall') || pathname.startsWith('/convention/book')) {
    return '/halls';
  }
  if (pathname.startsWith('/parking/book') || pathname.startsWith('/book/parking')) {
    return '/parking';
  }
  if (pathname.startsWith('/book/activities')) {
    return '/activities';
  }
  if (pathname.startsWith('/membership/join') || pathname.startsWith('/membership/dashboard')) {
    return '/membership';
  }
  return '/';
}

export function ProtectedRoute({ children, forceGated = false }) {
  const { user, authLoading } = useApp();
  const loc = useLocation();
  const { openAuthPrompt } = useAuthModal();

  // If in 'booking' mode and route is not forced gated, allow through if it's a public service page
  // When requireSignIn === 'services', all service pages remain gated.
  const isGated = requireSignIn === 'services' || forceGated;

  useEffect(() => {
    if (!authLoading && !user && isGated) {
      const from = `${loc.pathname}${loc.search}`;
      if (isSafeRedirect(from)) {
        openAuthPrompt(from);
      }
    }
  }, [authLoading, user, isGated, loc.pathname, loc.search, openAuthPrompt]);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!user && isGated) {
    const from = `${loc.pathname}${loc.search}`;
    if (isSafeRedirect(from)) {
      try {
        window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, from);
      } catch {
        /* storage disabled */
      }
    }
    const fallbackPath = getPublicFallback(loc.pathname);
    if (fallbackPath === loc.pathname || fallbackPath === '/') {
      return <Navigate to={`/signin?from=${encodeURIComponent(from)}`} replace state={{ from, authPrompt: true }} />;
    }
    return <Navigate to={fallbackPath} replace state={{ from, authPrompt: true }} />;
  }

  return children;
}

export const RequireAuth = ProtectedRoute;

