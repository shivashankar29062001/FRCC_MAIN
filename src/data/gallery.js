// ---------------------------------------------------------------------------
// /src/data/gallery.js — FRCC Gallery Data & Image Loader
// ---------------------------------------------------------------------------

// Vite glob import of all gallery images (dynamic, zero static imports)
const imagesGalleryGlob = import.meta.glob('../assets/images/gallery/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const assetsGalleryGlob = import.meta.glob('../assets/gallery/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ALL_GALLERY_FILES = {
  ...assetsGalleryGlob,
  ...imagesGalleryGlob,
};

// Map of { [filenameWithoutExt]: srcUrl }
export const GALLERY_MAP = {};
for (const path in ALL_GALLERY_FILES) {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  GALLERY_MAP[nameWithoutExt] = ALL_GALLERY_FILES[path];
}

/**
 * Category label map from data category key or filename prefix:
 * event- = Launch event
 * poster- = Posters
 * cinema- or culture- = Cinema & Culture
 * campus- = Campus
 */
export function normalizeCategory(categoryOrPrefix) {
  const lower = String(categoryOrPrefix || '').toLowerCase().trim();
  if (lower === 'event' || lower.startsWith('event-')) return 'Launch event';
  if (lower === 'poster' || lower.startsWith('poster-')) return 'Posters';
  if (lower === 'cinema' || lower === 'culture' || lower.startsWith('cinema-') || lower.startsWith('culture-')) return 'Cinema & Culture';
  if (lower === 'campus' || lower.startsWith('campus-')) return 'Campus';
  return 'Other';
}

function prettifyName(name) {
  return name
    .replace(/^([a-z]+-)+/, '')
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Curated entries
export const GALLERY_ENTRIES = [
  {
    file: 'event-stage-wide',
    category: 'event',
    caption: 'Grand launch of FRCC',
    alt: 'Grand launch of FRCC main stage with guests and attendees',
  },
  {
    file: 'event-group-photo',
    category: 'event',
    caption: 'Grand launch of FRCC',
    alt: 'Grand launch of FRCC group photo of guests and committee members',
  },
  {
    file: 'event-stage-guests',
    category: 'event',
    caption: 'Grand launch of FRCC',
    alt: 'Grand launch of FRCC guests and dignitaries on stage',
  },
  {
    file: 'event-unveiling-closeup',
    category: 'event',
    caption: 'Logo unveiling',
    alt: 'Logo unveiling close-up of the official FRCC emblem',
  },
  {
    file: 'event-unveiling-guests',
    category: 'event',
    caption: 'Logo unveiling',
    alt: 'Logo unveiling ceremony with distinguished guests',
  },
  {
    file: 'poster-launch-gold',
    category: 'poster',
    caption: 'Launch poster',
    alt: 'FRCC official launch poster with gold emblem',
  },
  {
    file: 'poster-launch-celebrities-dark',
    category: 'poster',
    caption: 'Launch poster',
    alt: 'FRCC launch poster with celebrities in dark aesthetic',
  },
  {
    file: 'poster-launch-celebrities-blue',
    category: 'poster',
    caption: 'Launch poster',
    alt: 'FRCC launch poster with celebrities in blue aesthetic',
  },
  {
    file: 'poster-join-membership',
    category: 'poster',
    caption: 'Membership poster',
    alt: 'FRCC join membership invitation poster',
  },
  {
    file: 'poster-membership-offer',
    category: 'poster',
    caption: 'Opening membership offer',
    alt: 'Opening membership offer poster for Film Recreation & Cultural Centre',
  },
  {
    file: 'poster-amaravati',
    category: 'poster',
    caption: 'Amaravati announcement',
    alt: 'FRCC Amaravati initiative announcement poster',
  },
];

// Order: Launch event photos first, then posters, then others
const CATEGORY_ORDER = {
  'Launch event': 1,
  'Posters': 2,
  'Cinema & Culture': 3,
  'Campus': 4,
  'Other': 5,
};

/**
 * Returns all valid gallery items that have existing files.
 * Items with a missing file are shown nowhere (no empty tiles).
 * Any extra files in the folder are dynamically categorized and appended.
 */
export function getGalleryItems() {
  const seenFiles = new Set();
  const items = [];

  // 1. Process curated entries (local files or remote items)
  for (const entry of GALLERY_ENTRIES) {
    if (entry.file) seenFiles.add(entry.file);
    if (entry.hidden) continue;

    // Remote item with URL and credit
    if (entry.url) {
      items.push({
        file: entry.file || entry.url,
        url: entry.url,
        credit: entry.credit,
        category: normalizeCategory(entry.category),
        categoryRaw: entry.category,
        caption: entry.caption,
        alt: entry.alt,
        src: entry.url,
      });
      continue;
    }

    // Local file entry
    const src = GALLERY_MAP[entry.file];
    if (src) {
      items.push({
        file: entry.file,
        category: normalizeCategory(entry.category),
        categoryRaw: entry.category,
        caption: entry.caption,
        alt: entry.alt,
        credit: entry.credit,
        src,
      });
    }
  }

  // 2. Discover any other files found in the gallery folder (excluding page hero slot)
  for (const fileName in GALLERY_MAP) {
    if (seenFiles.has(fileName) || fileName === 'hero-gallery' || fileName.startsWith('hero-')) {
      continue;
    }
    const cat = normalizeCategory(fileName);
    const pretty = prettifyName(fileName);
    items.push({
      file: fileName,
      category: cat,
      categoryRaw: cat,
      caption: pretty,
      alt: `${pretty} at FRCC`,
      src: GALLERY_MAP[fileName],
    });
  }

  // 3. Sort by: Launch event photos first, then posters, then others
  items.sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.category] || 99;
    const orderB = CATEGORY_ORDER[b.category] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return 0;
  });

  return items;
}

export const galleryItems = getGalleryItems();
export default galleryItems;
