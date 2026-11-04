import jsPDF from 'jspdf';
import { SITE_INFO } from '../config/siteInfo.js';
import { registrationNo } from '../config/organization.js';
import { formatDMY } from './dates.js';
import { formatINR } from './pricing.js';

/**
 * Generates and downloads a clean, professional PDF booking receipt for any
 * confirmed FRCC reservation (Stay, Dining, Activities, Halls, Parking).
 *
 * @param {object} booking The normalized booking record
 */
export function generateBookingReceiptPdf(booking) {
  if (!booking) return;

  const doc = new jsPDF();
  const ref = booking.bookingRef || booking.booking_reference || booking.bookingId || booking.id || 'N/A';
  const isHall = booking.category === 'hall' || String(ref).startsWith('FRCC-H-');
  const isParking =
    booking.category === 'parking' ||
    Boolean(booking.slot_id) ||
    Boolean(booking.parkingSlot) ||
    String(ref).includes('PARK');
  const isDining = !isHall && !isParking && (booking.category === 'dining' || String(ref).includes('TAB'));
  const isStay =
    !isHall &&
    !isParking &&
    !isDining &&
    (booking.category === 'hotel' ||
      booking.category === 'stay' ||
      Boolean(booking.checkin) ||
      String(ref).includes('STAY'));

  let serviceType = 'Recreational Activity';
  if (isStay) serviceType = 'Stay & Accommodation';
  else if (isDining) serviceType = 'Dining Table Reservation';
  else if (isHall) serviceType = 'Convention & Banquet Hall';
  else if (isParking) serviceType = 'Reserved Campus Parking';

  const title =
    booking.title ||
    booking.venue_name ||
    booking.venueName ||
    booking.roomName ||
    booking.gameName ||
    booking.game ||
    (isParking ? `Parking Slot ${booking.slot_id || booking.parkingSlot}` : 'Booking');

  // 1 · Header Banner (Navy #0F1F3D + Gold #C9A227 accent stripe)
  const headerHeight = 44;
  doc.setFillColor('#0F1F3D');
  doc.rect(0, 0, 210, headerHeight, 'F');
  doc.setFillColor('#C9A227');
  doc.rect(0, headerHeight - 3, 210, 2.5, 'F');

  // Header Typography
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#C9A227');
  doc.text('FRCC — FILM RECREATION & CULTURAL CENTRE', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor('#E2E8F0');
  doc.text(`Regd. No. ${registrationNo} • Official Booking Confirmation Receipt`, 14, 26);
  doc.text(`${SITE_INFO.locations[0]?.fullAddress || 'Vijayawada, NTR District, Andhra Pradesh – 520003'}`, 14, 32);

  // 2 · Receipt Title & Timestamp
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor('#0F1F3D');
  doc.text('BOOKING RECEIPT', 14, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#64748B');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 61);

  // 3 · Key Details Table Rows
  const rows = [
    ['Booking Reference', String(ref)],
    ['Service Category', serviceType],
    ['Facility / Space', String(title)],
  ];

  if (isStay) {
    rows.push(['Check-in Date', formatDMY(booking.checkin || booking.date)]);
    if (booking.checkout) rows.push(['Check-out Date', formatDMY(booking.checkout)]);
    if (booking.nights) rows.push(['Duration', `${booking.nights} Night${Number(booking.nights) > 1 ? 's' : ''}`]);
    if (booking.guests) rows.push(['Guests', String(booking.guests)]);
    rows.push(['Campus Location', String(booking.areaName || 'Vijayawada Campus')]);
  } else if (isDining) {
    rows.push(['Reservation Date', String(booking.date || '—')]);
    rows.push(['Time Slot', String(booking.time || booking.slot || '—')]);
    rows.push(['Party Size', String(booking.guests || '2 Guests')]);
    rows.push(['Table Reservation Fee', 'Complimentary (Free)']);
  } else if (isHall) {
    rows.push(['Event Date', formatDMY(booking.date)]);
    rows.push(['Reserved Timing', String(booking.time || `${booking.startTime || '09:00'} - ${booking.endTime || '18:00'}`)]);
    rows.push(['Expected Guests', String(booking.guests || '—')]);
    rows.push(['Venue Location', String(booking.areaName || 'FRCC Club Convention Block')]);
  } else if (isParking) {
    rows.push(['Parking Date', formatDMY(booking.date || booking.booking_date)]);
    rows.push(['Slot Number', String(booking.slot_id || booking.parkingSlot || booking.slot || '—')]);
    rows.push(['Arrival Time', String(booking.time || booking.arrival_time || '09:00')]);
    if (booking.vehicleNumber) {
      rows.push(['Vehicle', `${booking.vehicleNumber}${booking.vehicleType ? ` (${booking.vehicleType})` : ''}`]);
    }
    if (booking.duration || booking.durationDays) {
      rows.push(['Duration', String(booking.duration || `${booking.durationDays} Days`)]);
    }
    rows.push(['Campus Location', String(booking.areaName || 'Vijayawada Campus')]);
  } else {
    // Activity
    rows.push(['Activity Date', formatDMY(booking.date)]);
    rows.push(['Time Slot', String(booking.slot || '—')]);
    rows.push(['Players / Participants', String(booking.players || 1)]);
    rows.push(['Facility Location', String(booking.areaName || 'Vijayawada Campus • Sports Complex')]);
  }

  // Pricing Breakdown
  const totalAmount = Number(booking.total !== undefined ? booking.total : (booking.amount || 0));
  const subtotal = Number(booking.subtotal || totalAmount);
  const discount = Number(booking.discount || 0);

  if (subtotal > 0 && subtotal !== totalAmount) {
    rows.push(['Subtotal (Standard Rate)', formatINR(subtotal)]);
  }
  if (discount > 0) {
    rows.push(['Member Privilege Discount (30%)', `-${formatINR(discount)}`]);
  }
  rows.push(['Total Amount Paid', isDining ? 'Free (₹0)' : formatINR(totalAmount)]);
  rows.push(['Payment Method', String(booking.payment_method || booking.paymentMethod || (isDining ? 'Free Pass' : 'Online (UPI/Card)'))]);
  rows.push(['Booking Status', String(booking.status || 'Confirmed')]);

  // 4 · Render Card-like Table
  let y = 70;
  const boxHeight = rows.length * 8 + 4;
  doc.setFillColor('#F8FAFC');
  doc.rect(14, y, 182, boxHeight, 'F');
  doc.setDrawColor('#E2E8F0');
  doc.rect(14, y, 182, boxHeight, 'S');

  y += 6;
  rows.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#334155');
    doc.text(k, 18, y);

    const isTotal = k === 'Total Amount Paid';
    const isDisc = k.includes('Discount');
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(isTotal ? '#0F1F3D' : isDisc ? '#15803D' : '#0F172A');
    doc.text(String(v), 90, y);

    y += 8;
  });

  // 5 · Registered Office & Legal Contact Footer
  const footerY = Math.max(y + 14, 180);
  doc.setDrawColor('#CBD5E1');
  doc.line(14, footerY, 196, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor('#0F1F3D');
  doc.text('Film Recreation & Cultural Centre (FRCC)', 14, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor('#64748B');
  doc.text('This is a computer-generated confirmation receipt and does not require a physical signature.', 14, footerY + 11);
  doc.text(`For inquiries or concierge support, contact: ${SITE_INFO.phone || '+91 78936 16262'} • ${SITE_INFO.email || 'support@frcc.org.in'}`, 14, footerY + 16);
  doc.text(`Registered Office: ${SITE_INFO.locations[0]?.fullAddress || 'Vijayawada, NTR District, Andhra Pradesh – 520003'}`, 14, footerY + 21);

  doc.save(`FRCC-Receipt-${ref}.pdf`);
}

