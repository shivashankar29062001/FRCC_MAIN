// Downloads the FRCC clubhouse photo set (real photography from Unsplash —
// free for commercial use) into:
//   public/images/halls/<club>-<hall>/<club>-<hall>-N.jpg (+ .webp)
//   public/images/halls/<club>/<club>-hero.jpg (+ .webp)
// and writes public/images/halls/photo-credits.md with every source + licence.
//
// 40 hall photos (4 per hall × 10 halls) + 2 club heroes = 42 unique images.
// Safe to re-run: files are overwritten, nothing is duplicated in data.json
// (hall image paths are generated in server/db.js from the CLUBS seed).
//
// Usage:  node server/scripts/download-images.js    (from the repo root)

const fs = require('fs');
const path = require('path');

const HALLS_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'halls');

// ── Photo sets ─────────────────────────────────────────────────────────
// picks[0] becomes <folder>/<folder>-1.jpg (the hall card's lead photo).
// Extra ids act as backups if an image fails to download. Every image is
// used exactly once across all halls (no shared leads, no shared sets).
const SETS = [
  {
    folder: 'hyderabad-board-room',
    picks: [
      'photo-1431540015161-0bf868a2d407', // long executive table, panoramic windows
      'photo-1497366811353-6870744d04b2', // meeting table with executive chairs
      'photo-1552664730-d307ca884978',    // board meeting with laptops and screens
      'photo-1517048676732-d65bc937f952', // discussion around the board table
    ],
    backups: ['photo-1497366216548-37526070297c'],
  },
  {
    folder: 'hyderabad-meeting-room',
    picks: [
      'photo-1497366858526-0766cadbe8fa', // modern small meeting room
      'photo-1542626991-cbc4e32524cc',    // whiteboard planning session
      'photo-1531482615713-2afd69097998', // small glass meeting room, two people
      'photo-1517245386807-bb43f82c33c4', // laptop and notes on the meeting table
    ],
    backups: ['photo-1524758631624-e2822e304c36'],
  },
  {
    folder: 'hyderabad-conference-room',
    picks: [
      'photo-1524178232363-1fb2b075b655', // presentation screen, classroom seating
      'photo-1540575467063-178a50c2df87', // conference audience in a large hall
      'photo-1503428593586-e225b39bddfe', // delegates taking notes
      'photo-1568992687947-868a62a9f521', // long tables, workshop layout
    ],
    backups: ['photo-1542744173-8e7e53415bb0'],
  },
  {
    folder: 'hyderabad-convention-room',
    picks: [
      'photo-1587825140708-dfaf72ae4b04', // grand convention hall with stage
      'photo-1470229722913-7c0e2dbbafd3', // stage lighting over the crowd
      'photo-1522158637959-30385a09e0da', // stage light beams over seated guests
      'photo-1560439514-4e9645039924',    // packed hall during an event
    ],
    backups: ['photo-1540039155733-5bb30b53aa14'],
  },
  {
    folder: 'hyderabad-banquet-hall',
    picks: [
      'photo-1519167758481-83f550bb49b3', // ballroom with round tables and chandeliers
      'photo-1530023367847-a683933f4172', // banquet tables laid for dinner
      'photo-1511795409834-ef04bbd61622', // table setting with floral decor
      'photo-1464366400600-7168b8af9bc3', // banquet hall table settings
    ],
    backups: ['photo-1556125574-d7f27ec36a06'],
  },
  {
    folder: 'vijayawada-board-room',
    picks: [
      'photo-1517502884422-41eaead166d4', // glass-walled board room, long table
      'photo-1521737711867-e3b97375f902', // team around the board table
      'photo-1522071820081-009f0129c71c', // working session at the table
      'photo-1556761175-b413da4baf72',    // spacious table for board meetings
    ],
    backups: ['photo-1556761175-5973dc0f32e7'],
  },
  {
    folder: 'vijayawada-meeting-room',
    picks: [
      'photo-1571624436279-b272aff752b5', // oval meeting table with armchairs
      'photo-1568992688065-536aad8a12f6', // meeting room tables and screen
      'photo-1573497491208-6b1acb260507', // small meeting by the window
      'photo-1556761175-5973dc0f32e7',    // presentation to the team
    ],
    backups: ['photo-1591115765373-5207764f72e7'],
  },
  {
    folder: 'vijayawada-conference-room',
    picks: [
      'photo-1523580494863-6f3031224c94', // conference hall with projection screens
      'photo-1591115765373-5207764f72e7', // speaker presenting at a conference
      'photo-1489599849927-2ee91cede3ba', // theatre-style seating rows
      'photo-1561489396-888724a1543d',    // summit seating with screens
    ],
    backups: ['photo-1542744173-8e7e53415bb0'],
  },
  {
    folder: 'vijayawada-convention-room',
    picks: [
      'photo-1511578314322-379afb476865', // large hall with round tables and screens
      'photo-1540039155733-5bb30b53aa14', // stage show with lighting
      'photo-1505373877841-8d25f7d46678', // big screen with seated audience
      'photo-1531058020387-3be344556be6', // convention hall with an audience
    ],
    backups: ['photo-1522158637959-30385a09e0da'],
  },
  {
    folder: 'vijayawada-banquet-hall',
    picks: [
      'photo-1524824267900-2fa9cbf7a506', // banquet hall with round tables
      'photo-1519225421980-715cb0215aed', // long banquet tables with flowers
      'photo-1556125574-d7f27ec36a06',    // banquet setup with warm lighting
      'photo-1517457373958-b7bdd4587205', // guests dining under string lights
    ],
    backups: ['photo-1519741497674-611481863552'],
  },
  {
    folder: 'hyderabad-club',
    fileBase: 'hyderabad-club-hero',
    picks: ['photo-1486406146926-c627a92ad1ab'], // modern club building
    backups: ['photo-1542314831-068cd1dbfeeb'],
  },
  {
    folder: 'vijayawada-club',
    fileBase: 'vijayawada-club-hero',
    picks: ['photo-1542314831-068cd1dbfeeb'], // clubhouse exterior at dusk
    backups: ['photo-1486406146926-c627a92ad1ab'],
  },
];

const urlFor = (id, fm) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&h=675&q=80&fm=${fm}`;

async function fetchBuf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 20000) throw new Error(`suspiciously small (${buf.length} bytes)`);
  return buf;
}

async function main() {
  const used = new Set();
  const credits = [];

  for (const set of SETS) {
    const n = set.fileBase ? 1 : 4;
    const base = set.fileBase || set.folder;
    const dir = path.join(HALLS_DIR, set.folder);
    fs.mkdirSync(dir, { recursive: true });

    let slot = 0;
    for (const id of [...set.picks, ...(set.backups || [])]) {
      if (slot >= n) break;
      if (used.has(id)) continue;
      const fileName = n === 1 ? base : `${base}-${slot + 1}`;
      const fileBase = path.join(dir, fileName);
      try {
        const jpg = await fetchBuf(urlFor(id, 'jpg'));
        const webp = await fetchBuf(urlFor(id, 'webp'));
        fs.writeFileSync(`${fileBase}.jpg`, jpg);
        fs.writeFileSync(`${fileBase}.webp`, webp);
        used.add(id);
        credits.push({ file: `/images/halls/${set.folder}/${fileName}.jpg`, id });
        slot++;
        console.log(`✓ ${set.folder}/${fileName}.jpg  ← ${id}`);
      } catch (e) {
        console.log(`✗ ${id} failed (${e.message}) — trying next candidate`);
      }
    }
    if (slot < n) console.log(`⚠ ${set.folder}: only ${slot}/${n} images downloaded`);
  }

  // ── photo-credits.md ─────────────────────────────────────────────────
  const md = [
    '# Photo credits',
    '',
    'All photos are real photography downloaded from [Unsplash](https://unsplash.com) —',
    'free to use for commercial and non-commercial purposes under the',
    '[Unsplash License](https://unsplash.com/license) (no attribution required;',
    'sources listed below for reference).',
    '',
    'Regenerate with `node server/scripts/download-images.js` and verify with `npm run check:images`.',
    '',
  ];
  for (const c of credits) {
    md.push(`- \`${c.file}\` — https://images.unsplash.com/${c.id} (Unsplash License)`);
  }
  fs.writeFileSync(path.join(HALLS_DIR, 'photo-credits.md'), md.join('\n') + '\n');

  console.log(`\nDone: ${credits.length} images (jpg + webp) downloaded, ${used.size} unique photos.`);
  console.log(`Credits written to public/images/halls/photo-credits.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
