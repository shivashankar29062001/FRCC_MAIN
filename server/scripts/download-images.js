// Downloads the FRCC clubhouse photo set (real photography from Unsplash —
// free for commercial use) into:
//   public/images/halls/<club>-<hall>/<club>-<hall>-N.jpg (+ .webp)
//   public/images/halls/<club>/<club>-hero.jpg (+ .webp)
// and writes public/images/halls/photo-credits.md with every source + licence.
//
// AC halls: 40 photos (4 × 10). Non-AC halls: 36 photos (3-4 × 10).
// Plus 2 club heroes.
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
  // ── Non-AC halls (same rooms, fans & ventilation) ────────────────────
  // reuse:true lets a non-AC hall share a photo with an AC hall (only the
  // first photo of each hall must be unique — see check-images.js).
  {
    folder: 'hyderabad-board-room-non-ac',
    reuse: true,
    picks: [
      'photo-1462826303086-329426d1aef5', // long board table beside full-height windows
      'photo-1497366858526-0766cadbe8fa', // board table and chairs, bright daylight
      'photo-1517502884422-41eaead166d4', // board table facing the city skyline
      'photo-1543269664-56d93c1b41a6',    // planner working at the meeting table
    ],
    backups: ['photo-1524758631624-e2822e304c36'],
  },
  {
    folder: 'hyderabad-meeting-room-non-ac',
    reuse: true,
    picks: [
      'photo-1521737604893-d14cc237f11d', // team seated around a large table
      'photo-1522071820081-009f0129c71c', // group with laptops at a wooden table
      'photo-1522071901873-411886a10004', // review session at a white table
      'photo-1497215728101-856f4ea42174', // facilitator standing at a whiteboard
    ],
    backups: ['photo-1522202176988-66273c2fd55f'],
  },
  {
    folder: 'hyderabad-conference-room-non-ac',
    reuse: true,
    picks: [
      'photo-1560439513-74b037a25d84',    // speaker on stage with a screen
      'photo-1541339907198-e08756dedf3f', // attendees seated at desks
      'photo-1509062522246-3755977927d7', // presenter addressing a seminar room
    ],
    backups: ['photo-1571260899304-425eee4c7efc'],
  },
  {
    folder: 'hyderabad-convention-room-non-ac',
    reuse: true,
    picks: [
      'photo-1522673607200-164d1b6ce486', // large hall filled with guests, daylight
      'photo-1517457373958-b7bdd4587205', // open-air evening gathering under lights
      'photo-1505409859467-3a796fd5798e', // confetti over a celebration crowd
    ],
    backups: ['photo-1533174072545-7a4b6ad7a6c3'],
  },
  {
    folder: 'hyderabad-banquet-hall-non-ac',
    reuse: true,
    picks: [
      'photo-1527529482837-4698179dc6ce', // toast under string lights
      'photo-1478147427282-58a87a120781', // garden arbor ceremony setup
      'photo-1414235077428-338989a2e8c0', // plated dinner service
      'photo-1424847651672-bf20a4b0982b', // shared dining spread on the table
    ],
    backups: ['photo-1511795409834-ef04bbd61622'],
  },
  {
    folder: 'vijayawada-board-room-non-ac',
    reuse: true,
    picks: [
      'photo-1521737852567-6949f3f9f2b5', // two colleagues meeting at a table
      'photo-1551836022-d5d88e9218df',    // group around a wooden board table
      'photo-1542744094-3a31f272c490',    // team along a long wooden table
      'photo-1543269865-cbf427effbad',    // discussion across a bright table
    ],
    backups: ['photo-1517502884422-41eaead166d4'],
  },
  {
    folder: 'vijayawada-meeting-room-non-ac',
    reuse: true,
    picks: [
      'photo-1552581234-26160f608093',    // lounge seating beside tall windows
      'photo-1571260899304-425eee4c7efc', // plant-filled breakout area
      'photo-1522202176988-66273c2fd55f', // two people working together
      'photo-1556761175-b413da4baf72',    // small group at a shared desk
    ],
    backups: ['photo-1522071820081-009f0129c71c'],
  },
  {
    folder: 'vijayawada-conference-room-non-ac',
    reuse: true,
    picks: [
      'photo-1580582932707-520aed937b7b', // rows of desks facing the front
      'photo-1559223607-a43c990c692c',    // audience seated for a seminar
      'photo-1523240795612-9a054b0db644', // group working around a laptop
    ],
    backups: ['photo-1509062522246-3755977927d7'],
  },
  {
    folder: 'vijayawada-convention-room-non-ac',
    reuse: true,
    picks: [
      'photo-1492684223066-81342ee5ff30', // confetti over a large crowd
      'photo-1533174072545-7a4b6ad7a6c3', // packed hall with the crowd cheering
      'photo-1524368535928-5b5e00ddc76b', // audience with hands raised
    ],
    backups: ['photo-1505409859467-3a796fd5798e'],
  },
  {
    folder: 'vijayawada-banquet-hall-non-ac',
    reuse: true,
    picks: [
      'photo-1541532713592-79a0317b6b77', // guests raising glasses at a reception
      'photo-1523438885200-e635ba2c371e', // garden chairs set out for a ceremony
      'photo-1478146059778-26028b07395a', // dessert table against a brick wall
      'photo-1519671482749-fd09be7ccebf', // wine glasses raised in a toast
    ],
    backups: ['photo-1465495976277-4387d4b0b4c6'],
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
    const n = set.fileBase ? 1 : (set.picks.length < 4 ? set.picks.length : 4);
    const base = set.fileBase || set.folder;
    const dir = path.join(HALLS_DIR, set.folder);
    fs.mkdirSync(dir, { recursive: true });

    let slot = 0;
    for (const id of [...set.picks, ...(set.backups || [])]) {
      if (slot >= n) break;
      if (used.has(id) && !set.reuse) continue;
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
