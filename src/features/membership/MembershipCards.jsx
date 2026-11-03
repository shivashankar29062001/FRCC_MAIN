// ---------------------------------------------------------------------------
// /src/features/membership/MembershipCards.jsx — SVG Membership Cards
// 1. <MembershipIdCard />: 856x540 viewBox, Navy (#0b1a33) & Gold (#d4af55), FRCC emblem, QR, no animations.
// 2. <HealthCard />: 856x540 viewBox, Navy & Gold, FRCC emblem, Lifetime, diagnostic discount & note, no animations.
// ---------------------------------------------------------------------------

import { useId } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FRCC_LOGO_BASE64 } from '../../assets/logoBase64.js';
import { healthCardDiscountPercent, tagline as siteTagline } from '../../config/site.js';
import { PLANS_DATA } from '../../data/membership.js';
import { formatDMY } from '../../utils/dates.js';

/**
 * 1. <MembershipIdCard />
 * Name, member ID, plan, issue date, QR (value "FRCC:MEMBER:<memberId>"), tagline.
 * 856x540 viewBox, Navy (#0b1a33) and Gold (#d4af55), FRCC emblem, no animations.
 */
export function MembershipIdCard({
  member = {},
  id = 'frcc-membership-id-card',
  className = 'w-full h-auto drop-shadow-xl rounded-2xl',
}) {
  const gradId = useId();
  const patternId = useId();

  const name = member?.name || member?.fullName || 'Member Name';
  const memberId = member?.memberCode || member?.member_code || member?.memberId || member?.member_id || '';
  const planName = member?.planName || member?.plan_name || member?.plan || PLANS_DATA[0]?.name || 'FRCC Membership';
  const rawDate = member?.createdAt || member?.created_at || member?.valid_from;
  const issueDate = rawDate ? formatDMY(rawDate) : formatDMY(new Date().toISOString());
  const qrValue = member?.qr_code || member?.qrValue || (memberId ? `FRCC:MEMBER:${memberId}` : '');
  const tagline = siteTagline || 'Reel stories... real connections...';

  return (
    <svg
      id={id}
      viewBox="0 0 856 540"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', userSelect: 'none' }}
    >
      <defs>
        {/* Navy & Gold Card Gradients */}
        <linearGradient id={`bgGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b1a33" />
          <stop offset="60%" stopColor="#081427" />
          <stop offset="100%" stopColor="#050d1a" />
        </linearGradient>

        <linearGradient id={`goldGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c59b3f" />
          <stop offset="35%" stopColor="#f3d887" />
          <stop offset="70%" stopColor="#d4af55" />
          <stop offset="100%" stopColor="#9a7424" />
        </linearGradient>

        <linearGradient id={`goldTextGrad-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#d4af55" />
          <stop offset="100%" stopColor="#b48c36" />
        </linearGradient>

        <radialGradient id={`glowGrad-${gradId}`} cx="85%" cy="15%" r="65%">
          <stop offset="0%" stopColor="#d4af55" stopOpacity="0.22" />
          <stop offset="50%" stopColor="#d4af55" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#0b1a33" stopOpacity="0" />
        </radialGradient>

        {/* Subtle geometric luxury pattern */}
        <pattern id={`gridPattern-${patternId}`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 40 M 0 0 L 40 40"
            fill="none"
            stroke="#d4af55"
            strokeWidth="0.5"
            strokeOpacity="0.08"
          />
        </pattern>
      </defs>

      {/* Card Base */}
      <rect width="856" height="540" rx="28" fill={`url(#bgGrad-${gradId})`} />
      <rect width="856" height="540" rx="28" fill={`url(#glowGrad-${gradId})`} />
      <rect width="856" height="540" rx="28" fill={`url(#gridPattern-${patternId})`} />

      {/* Outer & Inner Gold Borders */}
      <rect
        x="6"
        y="6"
        width="844"
        height="528"
        rx="24"
        fill="none"
        stroke={`url(#goldGrad-${gradId})`}
        strokeWidth="2.5"
        strokeOpacity="0.85"
      />
      <rect
        x="18"
        y="18"
        width="820"
        height="504"
        rx="18"
        fill="none"
        stroke="#d4af55"
        strokeWidth="1"
        strokeDasharray="6 4"
        strokeOpacity="0.35"
      />

      {/* Decorative Guilloche Curves */}
      <path
        d="M 18 170 C 180 140, 280 200, 480 165 C 640 135, 740 180, 838 150"
        fill="none"
        stroke={`url(#goldGrad-${gradId})`}
        strokeWidth="1"
        strokeOpacity="0.25"
      />
      <path
        d="M 18 185 C 190 155, 300 215, 490 180 C 650 150, 750 195, 838 165"
        fill="none"
        stroke={`url(#goldGrad-${gradId})`}
        strokeWidth="0.75"
        strokeOpacity="0.18"
      />

      {/* Header: FRCC Emblem, Club Title, Tagline, & Badge */}
      <g transform="translate(42, 38)">
        {/* FRCC Emblem */}
        <image
          href={FRCC_LOGO_BASE64}
          x="0"
          y="0"
          width="82"
          height="82"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Club Name & Tagline */}
        <text
          x="98"
          y="32"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="21"
          fontWeight="800"
          letterSpacing="1.8"
        >
          FILM RECREATION &amp; CULTURAL CENTRE
        </text>

        <text
          x="98"
          y="60"
          fill="#d4af55"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="14.5"
          fontStyle="italic"
          fontWeight="500"
          letterSpacing="0.6"
        >
          {tagline}
        </text>

        {/* Top Right "MEMBERSHIP ID" Badge */}
        <rect
          x="620"
          y="10"
          width="152"
          height="34"
          rx="17"
          fill="#0b1a33"
          stroke={`url(#goldGrad-${gradId})`}
          strokeWidth="1.5"
        />
        <text
          x="696"
          y="32"
          fill="#d4af55"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12.5"
          fontWeight="700"
          letterSpacing="1.4"
        >
          MEMBERSHIP ID
        </text>
      </g>

      {/* Gold Divider Line */}
      <line
        x1="42"
        y1="138"
        x2="814"
        y2="138"
        stroke={`url(#goldGrad-${gradId})`}
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />

      {/* Member Details */}
      {/* 1. Member Name */}
      <text
        x="48"
        y="180"
        fill="#94a3b8"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="600"
        letterSpacing="1.2"
      >
        MEMBER NAME
      </text>
      <text
        x="48"
        y="222"
        fill="#ffffff"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="29"
        fontWeight="800"
        letterSpacing="0.5"
      >
        {name}
      </text>

      {/* 2. Member ID Number */}
      <text
        x="48"
        y="274"
        fill="#94a3b8"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="600"
        letterSpacing="1.2"
      >
        MEMBER ID NUMBER
      </text>
      <text
        x="48"
        y="316"
        fill={`url(#goldTextGrad-${gradId})`}
        fontFamily="'Courier New', Courier, monospace"
        fontSize="27"
        fontWeight="800"
        letterSpacing="2.5"
      >
        {memberId}
      </text>

      {/* 3. Grid Row: Plan Name, Issue Date, Validity */}
      <g transform="translate(48, 380)">
        {/* Plan */}
        <text
          x="0"
          y="0"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="1"
        >
          PLAN
        </text>
        <text
          x="0"
          y="28"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="17"
          fontWeight="700"
        >
          {planName}
        </text>

        {/* Issue Date */}
        <text
          x="260"
          y="0"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="1"
        >
          ISSUE DATE
        </text>
        <text
          x="260"
          y="28"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="17"
          fontWeight="700"
        >
          {issueDate}
        </text>

        {/* Validity */}
        <text
          x="440"
          y="0"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11.5"
          fontWeight="600"
          letterSpacing="1"
        >
          VALIDITY
        </text>
        <text
          x="440"
          y="28"
          fill="#48bb78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="17"
          fontWeight="800"
          letterSpacing="1"
        >
          LIFETIME
        </text>
      </g>

      {/* QR Code Container on Right */}
      <g transform="translate(636, 178)">
        <rect
          x="0"
          y="0"
          width="168"
          height="168"
          rx="18"
          fill="#ffffff"
          stroke={`url(#goldGrad-${gradId})`}
          strokeWidth="2.5"
        />
        {/* Nested SVG for standard crisp QR rendering */}
        <svg x="14" y="14" width="140" height="140" viewBox="0 0 140 140">
          <QRCodeSVG
            value={qrValue}
            size={140}
            fgColor="#0b1a33"
            bgColor="#ffffff"
            level="M"
          />
        </svg>
        <text
          x="84"
          y="198"
          fill="#d4af55"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1"
        >
          SCAN TO VERIFY
        </text>
      </g>

      {/* Card Footer Bar */}
      <rect
        x="24"
        y="476"
        width="808"
        height="40"
        rx="10"
        fill="#050d1a"
        stroke="#d4af55"
        strokeWidth="0.75"
        strokeOpacity="0.3"
      />
      <text
        x="44"
        y="501"
        fill="#64748b"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11.5"
        fontWeight="500"
      >
        Official Identification · Film Recreation &amp; Cultural Centre · Vijayawada, AP
      </text>
      <text
        x="812"
        y="501"
        fill="#d4af55"
        textAnchor="end"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11.5"
        fontWeight="700"
        letterSpacing="1.2"
      >
        VERIFIED ACTIVE
      </text>
    </svg>
  );
}

/**
 * 2. <HealthCard />
 * Title "FRCC Health Card", name, member ID, "Lifetime",
 * line "30% discount at collaborating diagnostic centres" (percent from site config),
 * and the healthCardNote from the data ("Discount valid only at diagnostic centres collaborating with FRCC.").
 * Show the centre list only when diagnosticCentres in the data is not empty.
 * 856x540 viewBox, Navy (#0b1a33) and Gold (#d4af55), FRCC emblem, no animations.
 */
export function HealthCard({
  member = {},
  id = 'frcc-health-card',
  className = 'w-full h-auto drop-shadow-xl rounded-2xl',
}) {
  const gradId = useId();
  const patternId = useId();

  const name = member?.name || member?.fullName || 'Member Name';
  const memberId = member?.memberCode || member?.member_code || member?.memberId || member?.member_id || '';
  const plan = PLANS_DATA[0] || {};
  const discountPercent = healthCardDiscountPercent || plan.healthCardDiscountPercent || 30;
  const healthCardNote = plan.healthCardNote || 'Discount valid only at diagnostic centres collaborating with FRCC.';
  const diagnosticCentres = Array.isArray(plan.diagnosticCentres) ? plan.diagnosticCentres : [];

  return (
    <svg
      id={id}
      viewBox="0 0 856 540"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', userSelect: 'none' }}
    >
      <defs>
        {/* Navy & Gold Card Gradients */}
        <linearGradient id={`hBgGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0b1a33" />
          <stop offset="60%" stopColor="#0a192f" />
          <stop offset="100%" stopColor="#050e1c" />
        </linearGradient>

        <linearGradient id={`hGoldGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c59b3f" />
          <stop offset="35%" stopColor="#f3d887" />
          <stop offset="70%" stopColor="#d4af55" />
          <stop offset="100%" stopColor="#9a7424" />
        </linearGradient>

        <linearGradient id={`hGoldTextGrad-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="50%" stopColor="#d4af55" />
          <stop offset="100%" stopColor="#b48c36" />
        </linearGradient>

        <radialGradient id={`hGlowGrad-${gradId}`} cx="15%" cy="85%" r="65%">
          <stop offset="0%" stopColor="#d4af55" stopOpacity="0.20" />
          <stop offset="50%" stopColor="#d4af55" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#0b1a33" stopOpacity="0" />
        </radialGradient>

        {/* Subtle cross / health motif pattern */}
        <pattern id={`hGridPattern-${patternId}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M 24 16 L 24 32 M 16 24 L 32 24"
            fill="none"
            stroke="#d4af55"
            strokeWidth="0.8"
            strokeOpacity="0.08"
          />
        </pattern>
      </defs>

      {/* Card Base */}
      <rect width="856" height="540" rx="28" fill={`url(#hBgGrad-${gradId})`} />
      <rect width="856" height="540" rx="28" fill={`url(#hGlowGrad-${gradId})`} />
      <rect width="856" height="540" rx="28" fill={`url(#hGridPattern-${patternId})`} />

      {/* Outer & Inner Gold Borders */}
      <rect
        x="6"
        y="6"
        width="844"
        height="528"
        rx="24"
        fill="none"
        stroke={`url(#hGoldGrad-${gradId})`}
        strokeWidth="2.5"
        strokeOpacity="0.85"
      />
      <rect
        x="18"
        y="18"
        width="820"
        height="504"
        rx="18"
        fill="none"
        stroke="#d4af55"
        strokeWidth="1"
        strokeDasharray="6 4"
        strokeOpacity="0.35"
      />

      {/* Header: FRCC Emblem, Title "FRCC Health Card", & Health Badge */}
      <g transform="translate(42, 38)">
        {/* FRCC Emblem */}
        <image
          href={FRCC_LOGO_BASE64}
          x="0"
          y="0"
          width="82"
          height="82"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Title: FRCC Health Card */}
        <text
          x="98"
          y="34"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="26"
          fontWeight="800"
          letterSpacing="1.5"
        >
          FRCC Health Card
        </text>

        <text
          x="98"
          y="62"
          fill="#d4af55"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="14"
          fontWeight="600"
          letterSpacing="0.8"
        >
          Diagnostic &amp; Preventive Care Privilege Pass
        </text>

        {/* Top Right "HEALTH PASS" Badge */}
        <rect
          x="630"
          y="10"
          width="142"
          height="34"
          rx="17"
          fill="#0b1a33"
          stroke={`url(#hGoldGrad-${gradId})`}
          strokeWidth="1.5"
        />
        <text
          x="701"
          y="32"
          fill="#d4af55"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12.5"
          fontWeight="700"
          letterSpacing="1.4"
        >
          HEALTH PASS
        </text>
      </g>

      {/* Gold Divider Line */}
      <line
        x1="42"
        y1="138"
        x2="814"
        y2="138"
        stroke={`url(#hGoldGrad-${gradId})`}
        strokeWidth="1.5"
        strokeOpacity="0.8"
      />

      {/* Member Details */}
      {/* 1. Member Name */}
      <text
        x="48"
        y="178"
        fill="#94a3b8"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="12"
        fontWeight="600"
        letterSpacing="1.2"
      >
        MEMBER NAME
      </text>
      <text
        x="48"
        y="218"
        fill="#ffffff"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="0.5"
      >
        {name}
      </text>

      {/* 2. Member ID & Lifetime Validity */}
      <g transform="translate(48, 245)">
        <text
          x="0"
          y="0"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="600"
          letterSpacing="1.2"
        >
          MEMBER ID
        </text>
        <text
          x="0"
          y="32"
          fill={`url(#hGoldTextGrad-${gradId})`}
          fontFamily="'Courier New', Courier, monospace"
          fontSize="24"
          fontWeight="800"
          letterSpacing="2"
        >
          {memberId}
        </text>

        <text
          x="480"
          y="0"
          fill="#94a3b8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="600"
          letterSpacing="1.2"
        >
          VALIDITY
        </text>
        <text
          x="480"
          y="32"
          fill="#48bb78"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="24"
          fontWeight="800"
          letterSpacing="1"
        >
          Lifetime
        </text>
      </g>

      {/* 3. Discount Highlight Panel */}
      <g transform="translate(44, 308)">
        <rect
          x="0"
          y="0"
          width="768"
          height="66"
          rx="14"
          fill="#060e1c"
          stroke={`url(#hGoldGrad-${gradId})`}
          strokeWidth="1.5"
          strokeOpacity="0.85"
        />

        {/* Caduceus / Health Icon Accent */}
        <g transform="translate(18, 15)">
          <circle cx="18" cy="18" r="18" fill="#d4af55" fillOpacity="0.15" />
          <path
            d="M 18 10 L 18 26 M 10 18 L 26 18"
            fill="none"
            stroke="#d4af55"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Required Discount Line */}
        <text
          x="70"
          y="40"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="19"
          fontWeight="800"
          letterSpacing="0.4"
        >
          <tspan fill="#f3d887">{discountPercent}% discount</tspan> at collaborating diagnostic centres
        </text>
      </g>

      {/* 4. Required Health Card Note */}
      <text
        x="48"
        y="408"
        fill="#cbd5e1"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="13.5"
        fontWeight="500"
      >
        {healthCardNote}
      </text>

      {/* 5. Diagnostic Centres List (Show ONLY when not empty) */}
      {diagnosticCentres.length > 0 && (
        <g transform="translate(48, 436)">
          <text
            x="0"
            y="0"
            fill="#d4af55"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="12"
            fontWeight="700"
            letterSpacing="1"
          >
            PARTNER CENTRES:
          </text>
          <text
            x="145"
            y="0"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="12.5"
            fontWeight="600"
          >
            {diagnosticCentres.join(' · ')}
          </text>
        </g>
      )}

      {/* Card Footer Bar */}
      <rect
        x="24"
        y="476"
        width="808"
        height="40"
        rx="10"
        fill="#050d1a"
        stroke="#d4af55"
        strokeWidth="0.75"
        strokeOpacity="0.3"
      />
      <text
        x="44"
        y="501"
        fill="#64748b"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11.5"
        fontWeight="500"
      >
        Present this card at reception prior to billing · Valid across all authorized diagnostics
      </text>
      <text
        x="812"
        y="501"
        fill="#d4af55"
        textAnchor="end"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11.5"
        fontWeight="700"
        letterSpacing="1.2"
      >
        HEALTH PRIVILEGE
      </text>
    </svg>
  );
}

/**
 * Converts an SVG DOM element to a high-resolution PNG Blob using pure HTML5 Canvas.
 *
 * @param {SVGElement} svgElement
 * @returns {Promise<Blob|null>}
 */
export async function getSvgAsPngBlob(svgElement) {
  if (!svgElement) return null;

  const svgXml = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL;
  const blobUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 2x resolution for ultra-sharp high-DPI output (1712 x 1080)
      const canvas = document.createElement('canvas');
      canvas.width = 856 * 2;
      canvas.height = 540 * 2;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(null);
    };
    img.src = blobUrl;
  });
}

/**
 * Downloads an SVG DOM element as a high-resolution PNG file using pure HTML5 Canvas (no external libraries).
 *
 * @param {SVGElement} svgElement
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function downloadSvgAsPng(svgElement, filename) {
  const blob = await getSvgAsPngBlob(svgElement);
  if (!blob) return;
  const URL = window.URL || window.webkitURL;
  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * Downloads both cards as PNG files:
 * - FRCC-ID-<memberId>.png
 * - FRCC-Health-<memberId>.png
 *
 * @param {string} memberId
 * @returns {Promise<void>}
 */
export async function downloadBothCards(memberId = '') {
  const cleanId = String(memberId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const idSvg = document.getElementById('frcc-membership-id-card');
  const healthSvg = document.getElementById('frcc-health-card');

  if (idSvg) {
    await downloadSvgAsPng(idSvg, cleanId ? `FRCC-ID-${cleanId}.png` : 'FRCC-ID.png');
  }
  // Brief delay to ensure browser sequential download trigger
  await new Promise((r) => setTimeout(r, 200));

  if (healthSvg) {
    await downloadSvgAsPng(healthSvg, cleanId ? `FRCC-Health-${cleanId}.png` : 'FRCC-Health.png');
  }
}

export default {
  MembershipIdCard,
  HealthCard,
  getSvgAsPngBlob,
  downloadSvgAsPng,
  downloadBothCards,
};
