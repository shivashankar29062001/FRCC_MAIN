const fs = require('fs');

let c = fs.readFileSync('src/components/layout/chrome.jsx', 'utf8');

const desktopTarget = `<NavLink
                to={ROUTES.applicationForm || '/membership/join'}
                className={({ isActive }) => topNavLink({ isActive: isActive || isApplicationForm })}
              >
                Application Form
              </NavLink>`;

const desktopReplace = `<a
                href="/FRCC-Membership-Application-Form.pdf"
                download="FRCC-Membership-Application-Form.pdf"
                onClick={(e) => downloadOfficialApplicationForm(e)}
                className="transition-colors duration-150 py-0.5 whitespace-nowrap text-slate-300 hover:text-gold-400 cursor-pointer"
                title="Download official FRCC Membership Application Form PDF"
              >
                Application Form
              </a>`;

const mobileTarget = `<NavLink
                    to={ROUTES.applicationForm || '/membership/join'}
                    onClick={closeAll}
                    className={({ isActive }) => mobileRowActive({ isActive: isActive || isApplicationForm })}
                  >
                    Application Form
                  </NavLink>`;

const mobileReplace = `<a
                    href="/FRCC-Membership-Application-Form.pdf"
                    download="FRCC-Membership-Application-Form.pdf"
                    onClick={(e) => {
                      closeAll();
                      downloadOfficialApplicationForm(e);
                    }}
                    className="block rounded-xl px-3 py-2.5 font-medium text-slate-700 transition-colors duration-150 hover:bg-navy-50 hover:text-navy-900 cursor-pointer"
                    title="Download official FRCC Membership Application Form PDF"
                  >
                    Application Form
                  </a>`;

const isCrlf = c.includes('\r\n');
const norm = s => s.replace(/\r\n/g, '\n');

let cNorm = norm(c);

if (cNorm.includes(desktopTarget)) {
  cNorm = cNorm.replace(desktopTarget, desktopReplace);
  console.log('Desktop link replaced');
} else {
  console.log('Desktop link not found');
}

if (cNorm.includes(mobileTarget)) {
  cNorm = cNorm.replace(mobileTarget, mobileReplace);
  console.log('Mobile link replaced');
} else {
  console.log('Mobile link not found');
}

cNorm = cNorm.replace(/  const isApplicationForm =\n    location\.pathname === '\/application-form' \|\|\n    location\.pathname === '\/membership\/join' \|\|\n    location\.pathname\.startsWith\('\/membership\/join'\);\n/, '');

const result = isCrlf ? cNorm.replace(/\n/g, '\r\n') : cNorm;
fs.writeFileSync('src/components/layout/chrome.jsx', result, 'utf8');
console.log('Updated chrome.jsx successfully');

