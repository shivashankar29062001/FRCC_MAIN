// ---------------------------------------------------------------------------
// /src/data/events.js — FRCC Events Definitions & Categories
// ---------------------------------------------------------------------------

export const EVENT_CATEGORIES = [
  { id: 'all', label: 'All Events' },
  { id: 'screening', label: 'Screenings' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'meetup', label: 'Meetups' },
  { id: 'cultural', label: 'Cultural' },
];

export const CATEGORY_LABELS = {
  screening: 'Screening',
  workshop: 'Workshop',
  meetup: 'Meetup',
  cultural: 'Cultural',
};

export const CATEGORY_BADGES = {
  screening: 'tag-navy',
  workshop: 'tag-gold',
  meetup: 'tag-green',
  cultural: 'tag-amber',
};

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Event';
}

export function getCategoryBadgeClass(category) {
  return CATEGORY_BADGES[category] || 'tag-navy';
}

export default {
  EVENT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_BADGES,
  getCategoryLabel,
  getCategoryBadgeClass,
};
