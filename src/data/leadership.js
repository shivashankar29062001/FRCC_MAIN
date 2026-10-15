// ---------------------------------------------------------------------------
// src/data/leadership.js — FRCC Leadership Team
// ---------------------------------------------------------------------------

const imagesLeadership = import.meta.glob('../assets/images/leadership/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const assetsLeadership = import.meta.glob('../assets/leadership/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imagesRoot = import.meta.glob('../assets/images/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const assetsRoot = import.meta.glob('../assets/*.{webp,jpg,jpeg,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const allImages = {
  ...assetsRoot,
  ...imagesRoot,
  ...assetsLeadership,
  ...imagesLeadership,
};

const ALIASES = {
  'president': [],
  'vice-president': ['vicepresident', 'vice_president'],
  'secretary': ['secretory'],
  'joint-secretary': ['joint_secretory', 'joint_secretary', 'jointsecretary', 'joint-secretory'],
  'treasurer': ['treserurer', 'treaserer', 'treasurer'],
  'executive-member-1': ['excutive_member', 'excutive-member'],
  'executive-member-2': ['executive_member', 'executive-member'],
};

function getFilename(filePath) {
  const base = filePath.slice(filePath.lastIndexOf('/') + 1);
  return base.replace(/\.[^.]+$/, '').toLowerCase();
}

function isLeadershipFolder(filePath) {
  return filePath.toLowerCase().includes('/leadership/');
}

function isGalleryFolder(filePath) {
  return filePath.toLowerCase().includes('/gallery/');
}

function resolveImage(slug) {
  if (!slug) return { url: null, path: null };
  const target = String(slug).toLowerCase();
  const aliasList = ALIASES[target] || [];

  const paths = Object.keys(allImages).filter((p) => !isGalleryFolder(p));

  // 1. Exact slug in leadership folder
  for (const p of paths) {
    if (isLeadershipFolder(p) && getFilename(p) === target) {
      return { url: allImages[p], path: p };
    }
  }

  // 2. Exact slug elsewhere
  for (const p of paths) {
    if (!isLeadershipFolder(p) && getFilename(p) === target) {
      return { url: allImages[p], path: p };
    }
  }

  // 3. Aliases in leadership folder
  for (const alias of aliasList) {
    for (const p of paths) {
      if (isLeadershipFolder(p) && getFilename(p) === alias.toLowerCase()) {
        return { url: allImages[p], path: p };
      }
    }
  }

  // 4. Aliases elsewhere
  for (const alias of aliasList) {
    for (const p of paths) {
      if (!isLeadershipFolder(p) && getFilename(p) === alias.toLowerCase()) {
        return { url: allImages[p], path: p };
      }
    }
  }

  return { url: null, path: null };
}

export const leadershipMembers = [
  {
    id: 'president',
    role: 'President',
    name: 'Janga Srinivasa Rao',
    image: 'president',
    bio: '',
  },
  {
    id: 'vice-president',
    role: 'Vice President',
    name: 'Gottuparthi Madhukar',
    image: 'vice-president',
    bio: '',
  },
  {
    id: 'secretary',
    role: 'Secretary',
    name: 'Thatty Arjuna Rao',
    image: 'secretary',
    bio: '',
  },
  {
    id: 'joint-secretary',
    role: 'Joint Secretary',
    name: 'Pagadala Soleman',
    image: 'joint-secretary',
    bio: '',
  },
  {
    id: 'treasurer',
    role: 'Treasurer',
    name: 'Mithana Eswara Rao',
    image: 'treasurer',
    bio: '',
  },
  {
    id: 'executive-member-1',
    role: 'Executive Member',
    name: 'Janga Prasanthi',
    image: 'executive-member-1',
    bio: '',
  },
  {
    id: 'executive-member-2',
    role: 'Executive Member',
    name: 'Kommoji Vamsi Krishna',
    image: 'executive-member-2',
    bio: '',
  },
].map((item) => {
  const match = resolveImage(item.image);
  return {
    ...item,
    alt: `${item.name}, ${item.role}`,
    matchedPath: match.path,
    imageSrc: match.url,
  };
});

export const leadership = leadershipMembers;
export default leadershipMembers;
