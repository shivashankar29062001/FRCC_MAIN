// FRCC CONVENTIONS - Authentication Service
// This is the SINGLE entry point for all authentication logic.
// The team's app handles login/signup; this app receives a redirect with user context.
//
// SUPPORTED AUTH_MODE values (set via VITE_AUTH_MODE):
// - 'mock' (default): fixed test user for local development
// - 'token_url': token passed in URL query param (?token=...) on redirect entry
// - 'cookie': shared session cookie; fetch user from ME_ENDPOINT
//
// TODO (for teammate): Once the team confirms their integration method,
// ONLY this file needs to change. Implement verifyExternalToken(token) for
// 'token_url' mode and fetchUserFromMeEndpoint() for 'cookie' mode.

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'mock';
const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || 'http://localhost:3000';
const ME_ENDPOINT = import.meta.env.VITE_ME_ENDPOINT || '/api/me';

// Storage keys
const TOKEN_KEY = 'frcc_token';
const USER_KEY = 'frcc_user';
const REDIRECT_HANDLED_KEY = 'frcc_redirect_handled';

// Mock test user for development
const MOCK_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@frcc.example',
  mobile: '9999999999',
};
const MOCK_TOKEN = 'mock-token-test-user-1';

// In-memory state (populated on load)
let currentUser = null;
let currentToken = null;
let initPromise = null;

/**
 * Get the current user (synchronous, returns cached value).
 * Call handleRedirectEntry() first on app load to populate.
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get the current auth token (synchronous, returns cached value).
 */
export function getAuthToken() {
  return currentToken;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated() {
  return !!currentUser && !!currentToken;
}

/**
 * Clear auth state (logout - though this app doesn't show logout UI).
 */
export function clearAuth() {
  currentUser = null;
  currentToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/**
 * Handle redirect entry from the team's app.
 * Call this ONCE on app startup (e.g., in main.jsx before rendering).
 * Returns a promise that resolves when auth is initialized.
 */
export async function handleRedirectEntry() {
  // Prevent double initialization
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 1. Try to restore from sessionStorage (for page refreshes)
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        currentToken = storedToken;
        currentUser = JSON.parse(storedUser);
        return;
      } catch {
        // Corrupted storage, clear and continue
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      }
    }

    // 2. Handle redirect entry based on AUTH_MODE
    switch (AUTH_MODE) {
      case 'mock':
        await handleMockMode();
        break;
      case 'token_url':
        await handleTokenUrlMode();
        break;
      case 'cookie':
        await handleCookieMode();
        break;
      default:
        console.warn(`Unknown AUTH_MODE: ${AUTH_MODE}, falling back to mock`);
        await handleMockMode();
    }

    // 3. If still no user, redirect to main app
    if (!currentUser) {
      redirectToMainApp();
    }
  })();

  return initPromise;
}

/**
 * Mock mode: use fixed test user.
 */
async function handleMockMode() {
  currentUser = MOCK_USER;
  currentToken = MOCK_TOKEN;
  sessionStorage.setItem(TOKEN_KEY, currentToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  // Log mock auth activation (dev only, never shown on screen)
  if (AUTH_MODE === 'mock') console.log('mock auth active');
}

/**
 * Token URL mode: read token from ?token=... query parameter.
 * Saves token to sessionStorage, then removes it from URL.
 */
async function handleTokenUrlMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    // Save token to sessionStorage
    sessionStorage.setItem(TOKEN_KEY, token);
    currentToken = token;

    // Remove token from URL without reloading
    urlParams.delete('token');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, document.title, newUrl);

    // Verify token and fetch user
    try {
      currentUser = await verifyExternalToken(token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Token verification failed:', e);
      clearAuth();
    }
  } else {
    // No token in URL - check if we have one stored
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        currentToken = storedToken;
        currentUser = JSON.parse(storedUser);
      } catch {
        clearAuth();
      }
    }
  }
}

/**
 * Cookie mode: shared session cookie.
 * Fetch user from ME_ENDPOINT (team's /api/me).
 */
async function handleCookieMode() {
  try {
    const res = await fetch(ME_ENDPOINT, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user || data;
      // Token might be in cookie, but we need something for Authorization header
      // Try to get from a custom header or use a placeholder
      currentToken = 'cookie-session';
      sessionStorage.setItem(TOKEN_KEY, currentToken);
      sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } else {
      clearAuth();
    }
  } catch (e) {
    console.error('Failed to fetch user from ME_ENDPOINT:', e);
    clearAuth();
  }
}

/**
 * Verify an external token (for token_url mode).
 * TODO: Implement actual verification with team's auth service.
 * For now, mock verification - extracts user from token payload if JWT,
 * or calls team's verification endpoint.
 */
async function verifyExternalToken(token) {
  // TODO: Replace with actual token verification
  // Example implementations:
  //
  // Option A: JWT verification (if team uses JWT)
  // const payload = jwtDecode(token); // or use a proper JWT library
  // return { id: payload.sub, name: payload.name, email: payload.email, mobile: payload.mobile };
  //
  // Option B: Call team's verification endpoint
  // const res = await fetch(`${MAIN_APP_URL}/api/auth/verify`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ token }),
  //   credentials: 'include',
  // });
  // if (!res.ok) throw new Error('Invalid token');
  // return res.json();
  //
  // Option C: Token is a user ID, fetch from ME_ENDPOINT
  // const res = await fetch(`${MAIN_APP_URL}/api/users/${token}`, { credentials: 'include' });
  // return res.json();

  // MOCK: For development, parse a simple token format "user-id|name|email|mobile"
  if (token.includes('|')) {
    const [id, name, email, mobile] = token.split('|');
    return { id, name, email, mobile };
  }

  // Fallback: return a mock user based on token
  return {
    id: token,
    name: 'External User',
    email: 'external@example.com',
    mobile: '9999999999',
  };
}

/**
 * Fetch user from ME_ENDPOINT (for cookie mode).
 * TODO: Implement if needed for cookie mode.
 */
async function fetchUserFromMeEndpoint() {
  // TODO: Implement if cookie mode needs custom logic
  const res = await fetch(ME_ENDPOINT, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

/**
 * Redirect to the main app's login/page with returnTo parameter.
 */
function redirectToMainApp() {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `${MAIN_APP_URL}/login?returnTo=${returnTo}`;
}

// Auto-initialize on import (for convenience)
// Components can also call handleRedirectEntry() explicitly
if (typeof window !== 'undefined') {
  // Defer to next tick so env vars are ready
  Promise.resolve().then(handleRedirectEntry);
}