import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';

// Protects pages 4–11: requires mock login. TODO(Phase 2): verify JWT/session with backend.
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

export function ProtectedRoute({ children }) {
  const { user } = useApp();
  const loc = useLocation();
  // Keep query (?game=…) so sign-in returns to the exact booking step.
  if (!user) {
    // Logged out → pre-sign-in landing page ("/"), never /signin.
    // Remember where the user wanted to go so SigninPage can return there.
    const from = `${loc.pathname}${loc.search}`;
    if (isSafeRedirect(from)) {
      try {
        window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, from);
      } catch {
        /* storage disabled — LandingPage still forwards via location.state */
      }
    }
    return <Navigate to="/" replace state={{ from }} />;
  }
  return children;
}
