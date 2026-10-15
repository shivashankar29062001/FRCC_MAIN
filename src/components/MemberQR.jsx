import { QRCodeSVG } from 'qrcode.react';

/**
 * Reusable Member QR component.
 * Renders an SVG QR code for FRCC:MEMBER:<memberId> with a white background,
 * navy foreground (#0b1a33), and quiet zone (includeMargin).
 * Gracefully handles missing memberId without breaking.
 */
export function MemberQR({ memberId, size = 200, className = '', id }) {
  if (!memberId) {
    return (
      <div
        id={id}
        className={`flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 text-xs ${className}`}
        style={{ width: size, height: size }}
        aria-label="No membership QR"
      >
        <span>No QR</span>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`inline-flex items-center justify-center rounded-xl bg-white p-2 shadow-sm ${className}`}
    >
      <QRCodeSVG
        value={`FRCC:MEMBER:${memberId}`}
        size={size}
        bgColor="#ffffff"
        fgColor="#0b1a33"
        includeMargin={true}
      />
    </div>
  );
}

export default MemberQR;
