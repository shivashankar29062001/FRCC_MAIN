const fs = require('fs');

// 1. ProfilePage.jsx
let p = fs.readFileSync('src/pages/ProfilePage.jsx', 'utf8');
const pTarget = `import {
  canCancelBooking,
  getCancellationPolicyInfo,
  cancelBooking,
} from '../services/cancellationService.js';`;
const pReplace = `import {
  canCancelBooking,
  getCancellationPolicyInfo,
  cancelBooking,
  getPersistedCancelledIds,
  persistCancelledId,
  isBookingCancelledLocally,
} from '../services/cancellationService.js';`;

if (p.includes(pTarget)) {
  p = p.replace(pTarget, pReplace);
  fs.writeFileSync('src/pages/ProfilePage.jsx', p, 'utf8');
  console.log('Fixed ProfilePage.jsx (crlf match)');
} else {
  // Try regex replace
  p = p.replace(/import\s*\{\s*canCancelBooking,\s*getCancellationPolicyInfo,\s*cancelBooking,?\s*\}\s*from\s*'\.\.\/services\/cancellationService\.js';/, pReplace);
  fs.writeFileSync('src/pages/ProfilePage.jsx', p, 'utf8');
  console.log('Fixed ProfilePage.jsx (regex match)');
}

// 2. ParkingBookingPage.jsx
let park = fs.readFileSync('src/features/parking/slot/ParkingBookingPage.jsx', 'utf8');
park = park.replace('const { user } = useApp();', 'const { user, pushToast } = useApp();');
fs.writeFileSync('src/features/parking/slot/ParkingBookingPage.jsx', park, 'utf8');
console.log('Fixed ParkingBookingPage.jsx');

// 3. MembershipJoinPage.jsx
let mem = fs.readFileSync('src/features/membership/MembershipJoinPage.jsx', 'utf8');
mem = mem.replace(
  'const assignedCode = saved?.memberCode || saved?.memberId || memberId;',
  "const assignedCode = saved?.memberCode || saved?.memberId || confirmedMemberId || '';"
);
fs.writeFileSync('src/features/membership/MembershipJoinPage.jsx', mem, 'utf8');
console.log('Fixed MembershipJoinPage.jsx');

// 4. ActivitiesProcessPage.jsx
let act = fs.readFileSync('src/features/activities/ActivitiesProcessPage.jsx', 'utf8');
const actTarget = "const mobileOk = cleanMobile.length === 10 || MOBILE_RE.test(draft.mobile.trim());";
const actReplace = "const mobileOk = isValidIndianMobile(draft.mobile);";
if (act.includes(actTarget)) {
  act = act.replace(actTarget, actReplace);
  fs.writeFileSync('src/features/activities/ActivitiesProcessPage.jsx', act, 'utf8');
  console.log('Fixed ActivitiesProcessPage.jsx');
} else {
  console.log('Warning: actTarget not found in ActivitiesProcessPage.jsx');
}

