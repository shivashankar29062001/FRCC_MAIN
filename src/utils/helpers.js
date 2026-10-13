export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/** True when the OS asks for reduced motion — animation code must respect it. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** First name for greetings/avatars. Never returns a raw email or phone. */
export function firstNameOf(name) {
  const v = String(name || '').trim();
  if (!v || v.includes('@') || /^[+\d][\d\s-]*$/.test(v)) return 'Guest';
  return v.split(' ')[0];
}

/** Up to 2 initials for avatar circles. Falls back to 'G' (Guest). */
export function initialsOf(name) {
  const v = String(name || '').trim();
  if (!v || v.includes('@') || /^[+\d][\d\s-]*$/.test(v)) return 'G';
  return v.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Masked contact for headers/menus: a***@gmail.com or +91 ******3210. Full value only in Profile > Personal Details. */
export function maskContact(contact) {
  const v = String(contact || '').trim();
  if (!v) return '';
  if (v.includes('@')) {
    const [u, d] = v.split('@');
    return `${u ? u[0] : ''}***@${d || ''}`;
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 4) return `+91 ******${digits.slice(-4)}`;
  return '***';
}

/** Time-of-day greeting used on the member home hero. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function bookingTitle(type, details = {}) {
  switch (type) {
    case 'hotel': return `Hotel · ${details.roomName || 'Room'} · ${details.checkIn || details.date || ''}`;
    case 'hall': return `Hall · ${details.hallName || details.hallType || 'Hall'} · ${details.date || ''}`;
    case 'parking': return `Parking · ${details.zone || 'Slot'} · ${details.date || ''}`;
    case 'activities': return `Activity · ${details.gameName || 'Game'} · ${details.date || ''}`;
    case 'membership': return `Membership · ${details.planName || 'Plan'}`;
    default: return 'Booking';
  }
}
