// Verifies every hall photo and club hero image:
//   1. exists on disk under public/ (jpg + webp twin), and
//   2. returns HTTP 200 from the running dev server (when reachable).
// Also fails if two halls share the same first image.
//
// Usage:  npm run check:images          (from the repo root or the server/ folder)
//         CHECK_IMAGES_BASE=http://localhost:5173 npm run check:images

const fs = require('fs');
const path = require('path');
const { readDb } = require('../db');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const BASE = process.env.CHECK_IMAGES_BASE || 'http://localhost:5173';

const fileFor = (urlPath) =>
  path.join(PUBLIC_DIR, urlPath.replace(/^\/+/, '').split('/').join(path.sep));

async function httpStatus(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status;
  } catch {
    return 0;
  }
}

async function checkImages() {
  const db = readDb();

  const items = [];
  for (const hall of db.halls || []) {
    for (const img of hall.images || []) {
      items.push({ type: 'hall', name: `${hall.id} ${hall.name} (${hall.venueName})`, url: img });
    }
  }
  for (const venue of db.venues || []) {
    if (venue.heroImage) items.push({ type: 'venue', name: `${venue.id} ${venue.name}`, url: venue.heroImage });
  }

  // Shared first images across halls (each hall card must have a unique lead photo)
  const firstImages = new Map();
  const dupes = [];
  for (const hall of db.halls || []) {
    const first = (hall.images || [])[0];
    if (!first) continue;
    if (firstImages.has(first)) dupes.push(`${hall.id} ${hall.name} shares its first image with ${firstImages.get(first)}`);
    else firstImages.set(first, `${hall.id} ${hall.name}`);
  }

  // Missing files on disk (jpg required, webp twin required)
  const missing = [];
  const webpMissing = [];
  let totalSize = 0;
  for (const it of items) {
    const jpgFile = fileFor(it.url);
    if (!fs.existsSync(jpgFile) || fs.statSync(jpgFile).size < 10000) {
      missing.push(it);
      continue;
    }
    totalSize += fs.statSync(jpgFile).size;
    const webpFile = jpgFile.replace(/\.jpg$/, '.webp');
    if (!fs.existsSync(webpFile) || fs.statSync(webpFile).size < 10000) webpMissing.push(it);
  }

  // HTTP check against the dev server (skipped when it is not running)
  const serverUp = (await httpStatus(`${BASE}/`)) !== 0;
  const non200 = [];
  if (serverUp) {
    for (const it of items) {
      const status = await httpStatus(`${BASE}${it.url}`);
      if (status !== 200) non200.push({ ...it, status });
    }
  }

  // Alt-text sanity: one alt per image
  const altMismatch = (db.halls || []).filter(h => h.imageAlts && h.imageAlts.length !== (h.images || []).length);

  const failures = missing.length + webpMissing.length + non200.length + dupes.length + altMismatch.length;

  console.log('\n=== IMAGE CHECK REPORT ===');
  console.log(`Halls: ${(db.halls || []).length}  •  Images referenced: ${items.length} (${items.filter(i => i.type === 'hall').length} hall photos, ${items.filter(i => i.type === 'venue').length} club heroes)`);
  console.log(`Dev server: ${BASE} — ${serverUp ? 'reachable' : 'not reachable (HTTP check skipped)'}`);
  console.log(`On disk: ${items.length - missing.length}/${items.length} jpg present (avg ${(totalSize / Math.max(1, items.length) / 1024).toFixed(0)} KB)`);

  if (missing.length) {
    console.log('\nMISSING FILES:');
    for (const m of missing) console.log(`  - ${m.type.toUpperCase()} ${m.name}: ${m.url}`);
  }
  if (webpMissing.length) {
    console.log('\nMISSING WEBP TWINS:');
    for (const m of webpMissing) console.log(`  - ${m.type.toUpperCase()} ${m.name}: ${m.url.replace(/\.jpg$/, '.webp')}`);
  }
  if (non200.length) {
    console.log('\nNON-200 RESPONSES:');
    for (const m of non200) console.log(`  - ${m.type.toUpperCase()} ${m.name}: ${m.url} → HTTP ${m.status}`);
  }
  if (dupes.length) {
    console.log('\nSHARED FIRST IMAGES:');
    for (const d of dupes) console.log(`  - ${d}`);
  }
  if (altMismatch.length) {
    console.log('\nALT-TEXT COUNT MISMATCH:');
    for (const h of altMismatch) console.log(`  - ${h.id} ${h.name}: ${h.imageAlts.length} alts for ${h.images.length} images`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Failures: ${failures}`);
  if (failures > 0) {
    console.log('❌ Some images are missing or failing');
    process.exit(1);
  } else {
    console.log('✅ All images present — 0 failures');
    process.exit(0);
  }
}

if (require.main === module) {
  checkImages();
}

module.exports = { checkImages };
