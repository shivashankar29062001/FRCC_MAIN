// ---------------------------------------------------------------------------
// session.js — THE ONE PLACE session logic lives.
// Holds login state + user id for the whole app, and is deliberately kept free
// of React so the Hotel / Hall / Parking / Membership teams' pages can import
// it directly once their modules are merged in.
// ---------------------------------------------------------------------------

export const SESSION_STORAGE_KEY = 'frcc.session.v1';
export const MEMBER_STORAGE_KEY = 'frcc.isMember.v1';
export const LOGGED_OUT_MARKER_KEY = 'frcc.loggedOut.v1';

const emptySession = Object.freeze({ userId: null, name: '', emailOrPhone: '', isMember: false, loggedIn: false });

export const DEMO_USER = Object.freeze({
  userId: 'FRCC-U-DEMO01',
  name: 'Demo Member',
  emailOrPhone: 'demo@frcc.club',
  isMember: true,
  isDemo: true,
  loggedIn: true,
});

/** Check if the user has explicitly logged out (marker set). */
export function hasLoggedOutMarker() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LOGGED_OUT_MARKER_KEY) === '1';
  } catch {
    return false;
  }
}

/** Set the logout marker (prevents demo auto-login until next sign-in). */
export function setLoggedOutMarker() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOGGED_OUT_MARKER_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Clear the logout marker (called after successful sign-in). */
export function clearLoggedOutMarker() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOGGED_OUT_MARKER_KEY);
  } catch {
    /* ignore */
  }
}

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readDemoFlag() {
  try {
    const saved = window.localStorage.getItem(MEMBER_STORAGE_KEY);
    if (saved !== null) return saved === '1';
    return true; // Default demo user has active membership
  } catch {
    return true;
  }
}

/** Read the current session (works even outside React). */
export function readSession() {
  if (typeof window === 'undefined') return { ...emptySession };
  const parsed = safeParse(window.sessionStorage.getItem(SESSION_STORAGE_KEY)) ||
    safeParse(window.localStorage.getItem(SESSION_STORAGE_KEY));
  if (parsed && parsed.userId) {
    const isMemberVal = parsed.isMember !== undefined ? Boolean(parsed.isMember) : readDemoFlag();
    return { ...emptySession, ...parsed, isMember: isMemberVal, loggedIn: true };
  }
  // Demo auto-login only if VITE_DEMO_MODE=true AND no explicit logout marker exists.
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true') {
    if (!hasLoggedOutMarker()) {
      const isMemberVal = readDemoFlag();
      return { ...DEMO_USER, isMember: isMemberVal };
    }
  }
  return { ...emptySession };
}

export function writeSession(session) {
  const value = { ...emptySession, ...session, loggedIn: true };
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage disabled — in-memory state still works for this session */
  }
  return value;
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return { ...emptySession };
}

/** Builds a new session identity. TODO: server issues the real user id. */
export function createSessionUser({ name, emailOrPhone, isMember = false }) {
  const seed = `${emailOrPhone || 'user'}-${name || 'member'}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 999999;
  return {
    userId: `FRCC-U-${String(hash).padStart(6, '0')}`,
    name: (name || emailOrPhone || 'Member').trim(),
    emailOrPhone: (emailOrPhone || '').trim(),
    isMember: Boolean(isMember),
    loggedIn: true,
  };
}

