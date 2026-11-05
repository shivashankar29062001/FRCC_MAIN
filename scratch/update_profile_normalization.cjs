const fs = require('fs');
let content = fs.readFileSync('src/pages/ProfilePage.jsx', 'utf8');

const targetTbl = `    // 2. Authoritative DB dining table bookings
    userTableBookings.forEach((tbl) => {
      const ref = tbl.bookingRef || tbl.booking_ref || tbl.bookingId || tbl.id;
      const uuid = tbl.uuid || tbl.rawId || tbl.raw_id || tbl.dbId || tbl.db_id || tbl.id;
      const normalized = {
        ...tbl,
        bookingRef: ref,
        bookingId: ref,
        id: ref,
        uuid,
        rawId: uuid,
      };
      bookingsByRef.set(ref, normalized);
      registerKeys(ref, tbl);
    });`;

const replacementTbl = `    // 2. Authoritative DB dining table bookings
    userTableBookings.forEach((tbl) => {
      const ref = tbl.bookingRef || tbl.booking_ref || tbl.bookingId || tbl.id;
      const uuid = tbl.uuid || tbl.rawId || tbl.raw_id || tbl.dbId || tbl.db_id || tbl.id;
      const isCancelled =
        cancelledIds.has(ref) ||
        cancelledIds.has(uuid) ||
        isBookingCancelledLocally(ref) ||
        isBookingCancelledLocally(uuid) ||
        (tbl.status && String(tbl.status).toLowerCase() === 'cancelled');
      const normalized = {
        ...tbl,
        bookingRef: ref,
        bookingId: ref,
        id: ref,
        uuid,
        rawId: uuid,
        status: isCancelled ? 'cancelled' : tbl.status,
      };
      bookingsByRef.set(ref, normalized);
      registerKeys(ref, tbl);
    });`;

const targetAppB = `    // 4. Merge general appBookings (from bookings table or local state)
    userAppBookings.forEach((appB) => {
      const ref = appB.bookingRef || appB.booking_ref || appB.bookingId || appB.id;
      const uuid = appB.uuid || appB.rawId || appB.raw_id || appB.dbId || appB.db_id || appB.id;
      if (ref && !bookingsByRef.has(ref)) {
        const normalized = {
          ...appB,
          bookingRef: ref,
          bookingId: ref,
          id: ref,
          uuid,
          rawId: uuid,
        };
        bookingsByRef.set(ref, normalized);
        registerKeys(ref, appB);
      }
    });`;

const replacementAppB = `    // 4. Merge general appBookings (from bookings table or local state)
    userAppBookings.forEach((appB) => {
      const ref = appB.bookingRef || appB.booking_ref || appB.bookingId || appB.id;
      const uuid = appB.uuid || appB.rawId || appB.raw_id || appB.dbId || appB.db_id || appB.id;
      const isCancelled =
        cancelledIds.has(ref) ||
        cancelledIds.has(uuid) ||
        isBookingCancelledLocally(ref) ||
        isBookingCancelledLocally(uuid) ||
        (appB.status && String(appB.status).toLowerCase() === 'cancelled');
      if (ref && !bookingsByRef.has(ref)) {
        const normalized = {
          ...appB,
          bookingRef: ref,
          bookingId: ref,
          id: ref,
          uuid,
          rawId: uuid,
          status: isCancelled ? 'cancelled' : appB.status,
        };
        bookingsByRef.set(ref, normalized);
        registerKeys(ref, appB);
      }
    });`;

const norm = (s) => s.replace(/\r?\n/g, '\n');
let normContent = norm(content);

normContent = normContent.replace(norm(targetTbl), norm(replacementTbl));
normContent = normContent.replace(norm(targetAppB), norm(replacementAppB));

if (content.includes('\r\n')) {
  normContent = normContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync('src/pages/ProfilePage.jsx', normContent, 'utf8');
console.log('Updated userTableBookings and userAppBookings in ProfilePage.jsx');

