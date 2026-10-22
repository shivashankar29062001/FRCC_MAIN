// ---------------------------------------------------------------------------
// /src/lib/applicationForm.js — FRCC Membership Application Form PDF Generator
// Generates official A4 portrait PDF using jsPDF (no html2canvas).
// Navy (#0b1a33) and Gold (#d4af55) accents, FRCC emblem, QR code, 5 sections.
// ---------------------------------------------------------------------------

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { FRCC_LOGO_BASE64 } from '../assets/logoBase64.js';
import {
  name as siteClubName,
  address as siteRegisteredAddress,
  phone as sitePhone,
  email as siteEmail,
  registration as siteRegistration,
  url as siteUrl,
} from '../config/site.js';
import { plans, formBenefits } from '../data/membership.js';
import { formatDMY } from '../utils/dates.js';
import { getSvgAsPngBlob } from '../features/membership/MembershipCards.jsx';

/**
 * Generates an in-memory QR code PNG data URL using the "qrcode" package.
 *
 * @param {string} value
 * @param {number} size
 * @returns {Promise<string|null>}
 */
export async function generateQrDataUrl(value, size = 300) {
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: size,
      color: { dark: '#0b1a33', light: '#ffffff' },
    });
  } catch (err) {
    console.warn('[applicationForm] QR generation error:', err);
    return null;
  }
}

/**
 * Formats a fee into Indian currency grouping or "Coupon (test)" when a coupon was used.
 *
 * @param {object} member
 * @returns {string}
 */
function formatMembershipFee(member = {}) {
  const isCoupon =
    Boolean(member.couponCode) ||
    member.paymentMethod === 'coupon' ||
    Boolean(member.isTest) ||
    member.amountPaid === 0;

  if (isCoupon) {
    return 'Coupon (test)';
  }

  const amount = Number(member.amountPaid ?? member.planPrice ?? 100000);
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Builds and returns a jsPDF document for the given membership record.
 * A4 portrait, Navy (#0b1a33) & Gold (#d4af55), FRCC emblem, 5 sections, auto-pagination.
 *
 * @param {object} member
 * @returns {Promise<jsPDF>}
 */
export async function buildApplicationFormPdf(member = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const memberId = member?.memberId || 'FRCC-2026-000000';
  const cleanId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');
  const planName = member?.planName || plans[0]?.name || 'FRCC Membership';
  const issueDate = member?.createdAt ? formatDMY(member.createdAt) : formatDMY(new Date().toISOString());
  const qrValue = `FRCC:MEMBER:${cleanId}`;

  // Safe Applicant details — never print full Aadhaar or file
  const applicantName = member?.name || 'Member';
  const applicantMobile = member?.mobile || '-';
  const applicantEmail = member?.email || '-';
  const dob = member?.dateOfBirth || member?.dob || '-';
  const gender = member?.gender || '-';

  // Address
  const addrParts = [
    member?.addressLine || member?.address || '',
    member?.city || '',
    member?.state || '',
    member?.pincode ? `PIN: ${member.pincode}` : '',
  ].filter(Boolean);
  const applicantAddress = addrParts.length > 0 ? addrParts.join(', ') : '-';

  const emergencyContact = member?.emergencyContact || '-';
  const aadhaarMasked = member?.aadhaarMasked || (member?.aadhaarLast4 ? `XXXX XXXX ${member.aadhaarLast4}` : '-');

  // Palette
  const NAVY = [11, 26, 51]; // #0b1a33
  const GOLD = [212, 175, 85]; // #d4af55
  const TEXT_DARK = [30, 41, 59]; // slate-800
  const TEXT_MUTED = [100, 116, 139]; // slate-500
  const BOX_BG = [248, 250, 252]; // slate-50
  const BORDER_COLOR = [226, 232, 240]; // slate-200

  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const MARGIN_LEFT = 14;
  const MARGIN_RIGHT = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 182mm
  const BOTTOM_LIMIT = 265; // Leave room for signatures / footers

  let currentY = 12;

  // -------------------------------------------------------------------------
  // Header: FRCC Logo, Club Name, Title, Registered Office Address
  // -------------------------------------------------------------------------
  try {
    doc.addImage(FRCC_LOGO_BASE64, 'PNG', MARGIN_LEFT, currentY, 18, 18);
  } catch (err) {
    console.warn('[applicationForm] Logo embed warning:', err);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text(siteClubName || 'Film Recreation & Cultural Centre', MARGIN_LEFT + 22, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text('Membership Application Form', MARGIN_LEFT + 22, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const addressLines = doc.splitTextToSize(`Registered Office: ${siteRegisteredAddress}`, CONTENT_WIDTH - 22);
  doc.text(addressLines, MARGIN_LEFT + 22, currentY + 15);

  currentY = 32;

  // Gold & Navy accent separator
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_LEFT, currentY, MARGIN_LEFT + CONTENT_WIDTH, currentY);

  currentY += 4;

  // Helper: Section Header Bar
  function drawSectionBar(title) {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(MARGIN_LEFT, currentY, CONTENT_WIDTH, 5.5, 'F');
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(MARGIN_LEFT, currentY, 2.5, 5.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), MARGIN_LEFT + 5, currentY + 4);
    currentY += 7.5;
  }

  // -------------------------------------------------------------------------
  // Section 1: Membership Details (Member ID, Plan, Lifetime, Fee, Date, QR)
  // -------------------------------------------------------------------------
  drawSectionBar('1. Membership Details');

  const s1BoxY = currentY;
  const s1BoxH = 34;

  doc.setFillColor(BOX_BG[0], BOX_BG[1], BOX_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_LEFT, s1BoxY, CONTENT_WIDTH, s1BoxH, 1.5, 1.5, 'FD');

  const s1Fields = [
    ['Member ID', cleanId],
    ['Plan Name', planName],
    ['Membership Type', 'Lifetime'],
    ['Fee Paid', formatMembershipFee(member)],
    ['Date of Issue', issueDate],
  ];

  let fY = s1BoxY + 5.5;
  s1Fields.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label, MARGIN_LEFT + 4, fY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(`:  ${val}`, MARGIN_LEFT + 34, fY);

    fY += 5.5;
  });

  // QR Code on right side
  const qrDataUrl = await generateQrDataUrl(qrValue, 300);
  if (qrDataUrl) {
    try {
      const qrSize = 25;
      const qrX = MARGIN_LEFT + CONTENT_WIDTH - qrSize - 4;
      const qrY = s1BoxY + 3.5;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFont('courier', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(cleanId, qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    } catch (e) {
      console.warn('[applicationForm] QR embed warning:', e);
    }
  }

  currentY = s1BoxY + s1BoxH + 4;

  // -------------------------------------------------------------------------
  // Section 2: Applicant Details (Name, Mobile, Email, DOB, Gender, Address, Contact, Aadhaar masked)
  // -------------------------------------------------------------------------
  drawSectionBar('2. Applicant Details');

  const s2BoxY = currentY;
  const s2BoxH = 34;

  doc.setFillColor(BOX_BG[0], BOX_BG[1], BOX_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_LEFT, s2BoxY, CONTENT_WIDTH, s2BoxH, 1.5, 1.5, 'FD');

  const col1 = [
    ['Full Name', applicantName],
    ['Mobile Number', applicantMobile],
    ['Email Address', applicantEmail],
    ['Emergency Contact', emergencyContact],
  ];

  const col2 = [
    ['Date of Birth', dob],
    ['Gender', gender],
    ['Aadhaar (Masked)', aadhaarMasked],
    ['Residential Address', applicantAddress],
  ];

  let col1Y = s2BoxY + 5.5;
  col1.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label, MARGIN_LEFT + 4, col1Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`:  ${val}`, MARGIN_LEFT + 32, col1Y);

    col1Y += 6.5;
  });

  let col2Y = s2BoxY + 5.5;
  const col2X = MARGIN_LEFT + 92;
  col2.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(label, col2X, col2Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

    if (label === 'Residential Address') {
      const wrapped = doc.splitTextToSize(`:  ${val}`, CONTENT_WIDTH - 92 - 32);
      doc.text(wrapped, col2X + 28, col2Y);
    } else {
      doc.text(`:  ${val}`, col2X + 28, col2Y);
    }

    col2Y += 6.5;
  });

  currentY = s2BoxY + s2BoxH + 4;

  // -------------------------------------------------------------------------
  // Section 3: Your Membership Benefits (Read from formBenefits in membership.js)
  // -------------------------------------------------------------------------
  drawSectionBar('3. Your Membership Benefits');

  const benefitsList = formBenefits || [
    '30% discount on every booking',
    'Health card: 30% discount at collaborating diagnostic centres',
    'Membership ID card and Health card',
  ];

  const s3BoxY = currentY;
  const s3BoxH = Math.max(18, benefitsList.length * 4.4 + 4);

  doc.setFillColor(BOX_BG[0], BOX_BG[1], BOX_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN_LEFT, s3BoxY, CONTENT_WIDTH, s3BoxH, 1.5, 1.5, 'FD');

  let bY = s3BoxY + 5;
  benefitsList.forEach((benefit) => {
    // Gold bullet dot
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.circle(MARGIN_LEFT + 6, bY - 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(benefit, MARGIN_LEFT + 10, bY);

    bY += 4.4;
  });

  currentY = s3BoxY + s3BoxH + 4;

  // -------------------------------------------------------------------------
  // Section 4: Declaration & Signatures (Renumbered from 5)
  // -------------------------------------------------------------------------
  drawSectionBar('4. Declaration & Signatures');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const declText =
    'I hereby declare that the particulars given above are true, complete, and correct to the best of my knowledge and belief. I agree to abide by the rules, regulations, and bye-laws of the Film Recreation & Cultural Centre (FRCC).';
  const declLines = doc.splitTextToSize(declText, CONTENT_WIDTH);
  doc.text(declLines, MARGIN_LEFT, currentY);

  currentY += declLines.length * 3.2 + 8;

  // Two signature lines
  const sigColWidth = 75;
  const sigLineY = currentY + 6;

  // Left signature: Member
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_LEFT + 5, sigLineY, MARGIN_LEFT + 5 + sigColWidth, sigLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text('Member Signature & Date', MARGIN_LEFT + 5, sigLineY + 4);

  // Right signature: Authorised Signatory
  const sig2X = MARGIN_LEFT + CONTENT_WIDTH - sigColWidth - 5;
  doc.line(sig2X, sigLineY, sig2X + sigColWidth, sigLineY);

  doc.text('Authorised Signatory', sig2X, sigLineY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Film Recreation & Cultural Centre', sig2X, sigLineY + 7.5);

  // -------------------------------------------------------------------------
  // Global Footers & Page Numbers across all pages
  // -------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  const cleanWebsite = (siteUrl || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Separator line
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, 288, MARGIN_LEFT + CONTENT_WIDTH, 288);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const regText = siteRegistration?.id ? `  |  Reg. No: ${siteRegistration.id}` : '';
    doc.text(`Phone: ${sitePhone}  |  Email: ${siteEmail}${regText}`, MARGIN_LEFT, 292);

    const pageText = cleanWebsite
      ? `Page ${i} of ${totalPages}  |  ${cleanWebsite}`
      : `Page ${i} of ${totalPages}`;

    doc.text(
      pageText,
      MARGIN_LEFT + CONTENT_WIDTH,
      292,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Downloads the application form as a PDF file: FRCC-Application-<memberId>.pdf
 *
 * @param {object} member
 * @returns {Promise<void>}
 */
export async function downloadApplicationFormPdf(member = {}) {
  const memberId = member?.memberId || 'FRCC-2026-000000';
  const cleanId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');
  const doc = await buildApplicationFormPdf(member);
  doc.save(`FRCC-Application-${cleanId}.pdf`);
}

/**
 * Converts jsPDF doc to a standard Blob.
 *
 * @param {jsPDF} doc
 * @returns {Blob}
 */
export function getPdfBlob(doc) {
  return doc.output('blob');
}

/**
 * Handles sending/sharing membership documents via WhatsApp.
 * When navigator.canShare({ files }) is true: shares PDF + 2 PNG card files.
 * Otherwise: downloads the 3 files and opens https://wa.me/<91 + member mobile>?text=<encoded message>.
 *
 * TODO-WHATSAPP-API: automatic sending from the club number 917893616262 needs the WhatsApp Business API on the backend (documents and images with approved templates).
 *
 * @param {object} member
 * @returns {Promise<void>}
 */
export async function sendMembershipToWhatsApp(member = {}) {
  // TODO-WHATSAPP-API: automatic sending from the club number 917893616262 needs the WhatsApp Business API on the backend (documents and images with approved templates).
  const memberId = member?.memberId || 'FRCC-2026-000000';
  const cleanId = String(memberId).replace(/[^a-zA-Z0-9_-]/g, '');
  const textMessage = `FRCC Membership. Member ID: ${cleanId}. Your application form, Membership ID card and Health card are attached.`;

  // Clean member mobile number
  const mobileDigits = String(member?.mobile || '').replace(/\D/g, '').slice(-10);
  const waTargetMobile = mobileDigits ? `91${mobileDigits}` : '917893616262';

  // 1. Build Application Form PDF File
  const doc = await buildApplicationFormPdf(member);
  const pdfBlob = getPdfBlob(doc);
  const pdfFile = new File([pdfBlob], `FRCC-Application-${cleanId}.pdf`, { type: 'application/pdf' });

  // 2. Build ID Card PNG File from DOM SVG
  let idCardFile = null;
  const idSvg = document.getElementById('frcc-membership-id-card');
  if (idSvg) {
    const blob = await getSvgAsPngBlob(idSvg);
    if (blob) {
      idCardFile = new File([blob], `FRCC-ID-${cleanId}.png`, { type: 'image/png' });
    }
  }

  // 3. Build Health Card PNG File from DOM SVG
  let healthCardFile = null;
  const healthSvg = document.getElementById('frcc-health-card');
  if (healthSvg) {
    const blob = await getSvgAsPngBlob(healthSvg);
    if (blob) {
      healthCardFile = new File([blob], `FRCC-Health-${cleanId}.png`, { type: 'image/png' });
    }
  }

  const filesToShare = [pdfFile, idCardFile, healthCardFile].filter(Boolean);

  // Check if Web Share API with files is supported
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    filesToShare.length > 0 &&
    navigator.canShare({ files: filesToShare });

  if (canShareFiles) {
    try {
      await navigator.share({
        files: filesToShare,
        text: textMessage,
      });
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[applicationForm] Web Share failed, falling back to download + wa.me link:', err);
      } else {
        return;
      }
    }
  }

  // Fallback: Download the 3 files and open wa.me link
  doc.save(`FRCC-Application-${cleanId}.pdf`);

  if (idCardFile) {
    const URL = window.URL || window.webkitURL;
    const a = document.createElement('a');
    a.download = idCardFile.name;
    a.href = URL.createObjectURL(idCardFile);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  await new Promise((r) => setTimeout(r, 200));

  if (healthCardFile) {
    const URL = window.URL || window.webkitURL;
    const a = document.createElement('a');
    a.download = healthCardFile.name;
    a.href = URL.createObjectURL(healthCardFile);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const waUrl = `https://wa.me/${waTargetMobile}?text=${encodeURIComponent(textMessage)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

export default {
  buildApplicationFormPdf,
  downloadApplicationFormPdf,
  sendMembershipToWhatsApp,
  generateQrDataUrl,
};
