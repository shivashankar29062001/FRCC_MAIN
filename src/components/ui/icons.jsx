// ---------------------------------------------------------------------------
// One consistent icon set for the whole app (24px stroke icons, currentColor).
// Kept local on purpose — no new dependency, no icon-library mismatch.
// TODO(Phase 2): if the team adopts lucide-react, replace these exports 1:1.
// ---------------------------------------------------------------------------
function makeIcon(displayName, children) {
  function Icon({ className = 'h-5 w-5', ...rest }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...rest}
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

/* Services */
export const HotelIcon = makeIcon('HotelIcon', (
  <>
    <path d="M3 19v-8a2 2 0 0 1 2-2h3a3 3 0 0 1 3 3h7a3 3 0 0 1 3 3v4" />
    <path d="M3 16h18" />
    <path d="M3 19v1.5" />
    <path d="M21 19v1.5" />
    <circle cx="7.5" cy="9.5" r="1.6" />
  </>
));
export const HallIcon = makeIcon('HallIcon', (
  <>
    <path d="M12 3 3 8.5h18L12 3Z" />
    <path d="M5 20.5V11" />
    <path d="M9.7 20.5V11" />
    <path d="M14.3 20.5V11" />
    <path d="M19 20.5V11" />
    <path d="M3 20.5h18" />
  </>
));
export const ParkingIcon = makeIcon('ParkingIcon', (
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M10 17V7.5h3.2a3 3 0 0 1 0 6H10" />
  </>
));
export const GamepadIcon = makeIcon('GamepadIcon', (
  <>
    <path d="M7.2 7h9.6A4.8 4.8 0 0 1 21.6 11.8L21.9 15a2.6 2.6 0 0 1-4.7 1.8L16 15.5H8l-1.2 1.3A2.6 2.6 0 0 1 2.1 15l.3-3.2A4.8 4.8 0 0 1 7.2 7Z" />
    <path d="M7.5 10v3" />
    <path d="M6 11.5h3" />
    <circle cx="16" cy="10.8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="18" cy="13.4" r=".9" fill="currentColor" stroke="none" />
  </>
));
export const MembershipIcon = makeIcon('MembershipIcon', (
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.6" />
    <path d="M2.5 10h19" />
    <path d="M6.5 14.5h4.5" />
    <path d="M17 14.5h1.5" />
  </>
));

/* Arrows / chevrons */
export const ArrowLeftIcon = makeIcon('ArrowLeftIcon', (
  <>
    <path d="M20 12H5" />
    <path d="m11 18-6-6 6-6" />
  </>
));
export const ArrowRightIcon = makeIcon('ArrowRightIcon', (
  <>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </>
));
export const ArrowUpRightIcon = makeIcon('ArrowUpRightIcon', (
  <>
    <path d="M7 17 17 7" />
    <path d="M8.5 7H17v8.5" />
  </>
));
export const ChevronDownIcon = makeIcon('ChevronDownIcon', <path d="m6 9.5 6 6 6-6" />);
export const ChevronUpIcon = makeIcon('ChevronUpIcon', <path d="m18 14.5-6-6-6 6" />);
export const ChevronLeftIcon = makeIcon('ChevronLeftIcon', <path d="m14.5 6-6 6 6 6" />);
export const ChevronRightIcon = makeIcon('ChevronRightIcon', <path d="m9.5 6 6 6-6 6" />);

/* Status / feedback */
export const CheckIcon = makeIcon('CheckIcon', <path d="m4.5 12.5 5 5 10-11" />);
export const CheckCircleIcon = makeIcon('CheckCircleIcon', (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.4 2.6 2.6 5-5.4" />
  </>
));
export const XIcon = makeIcon('XIcon', (
  <>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </>
));
export const MenuIcon = makeIcon('MenuIcon', (
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>
));
export const StarIcon = makeIcon('StarIcon', (
  <path
    d="m12 3.4 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 9.8l6.1-.9L12 3.4Z"
    fill="currentColor"
    stroke="none"
  />
));
export const SparklesIcon = makeIcon('SparklesIcon', (
  <>
    <path d="M11 3.5 12.6 8l4.4 1.5-4.4 1.6L11 15.5 9.4 11.1 5 9.5 9.4 8 11 3.5Z" />
    <path d="M18 15.2l.9 2 2 .8-2 .9-.9 2-.9-2-2-.9 2-.8.9-2Z" />
  </>
));
export const ShieldIcon = makeIcon('ShieldIcon', (
  <>
    <path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.8 7 9.3 4.1-1.5 7-5 7-9.3V5.8L12 3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </>
));
export const InfoIcon = makeIcon('InfoIcon', (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>
));

/* Content / data */
export const ClockIcon = makeIcon('ClockIcon', (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 1.8" />
  </>
));
export const CalendarIcon = makeIcon('CalendarIcon', (
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.6" />
    <path d="M3.5 10h17" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </>
));
export const UsersIcon = makeIcon('UsersIcon', (
  <>
    <path d="M15.5 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
    <circle cx="9.2" cy="7.5" r="3.6" />
    <path d="M16.8 4.2a3.6 3.6 0 0 1 0 6.6" />
    <path d="M21 20v-1.5a4 4 0 0 0-3-3.8" />
  </>
));
export const MapPinIcon = makeIcon('MapPinIcon', (
  <>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>
));
export const PhoneIcon = makeIcon('PhoneIcon', (
  <path d="M6.4 3.5h3l1.5 4-2 1.4a12.4 12.4 0 0 0 6.2 6.2l1.4-2 4 1.5v3a2 2 0 0 1-2.1 2A16.6 16.6 0 0 1 4.4 5.6a2 2 0 0 1 2-2.1Z" />
));
export const MailIcon = makeIcon('MailIcon', (
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.6" />
    <path d="m4 7.5 8 5.4 8-5.4" />
  </>
));
export const SearchIcon = makeIcon('SearchIcon', (
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>
));
export const FilterIcon = makeIcon('FilterIcon', (
  <>
    <path d="M4 6.5h16" />
    <path d="M7 12h10" />
    <path d="M10 17.5h4" />
  </>
));
export const BellIcon = makeIcon('BellIcon', (
  <>
    <path d="M18 9.5a6 6 0 1 0-12 0c0 4.5-2 6-2 6h16s-2-1.5-2-6Z" />
    <path d="M10.3 19a2 2 0 0 0 3.4 0" />
  </>
));
export const QrIcon = makeIcon('QrIcon', (
  <>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" />
    <path d="M14 14h3.2v3.2" />
    <path d="M20.5 14v6.5H14" />
    <path d="M17.6 17.6h2.9" />
  </>
));
export const ImageIcon = makeIcon('ImageIcon', (
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m5 17.5 4.5-4.2 3.4 3 3-2.6 3.6 3.8" />
  </>
));
export const InboxIcon = makeIcon('InboxIcon', (
  <>
    <path d="M6.4 5h11.2l2.9 8v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V13l2.9-8Z" />
    <path d="M3.5 13h4.2l1.5 3h5.6l1.5-3h4.2" />
  </>
));
export const QuoteIcon = makeIcon('QuoteIcon', (
  <path
    d="M10.4 6.5C7.4 7.7 5.6 10 5.6 13.2V17.5H10V12H7.6c.1-1.7 1-3 2.8-3.8V6.5Zm8.6 0c-3 1.2-4.8 3.5-4.8 6.7V17.5H19V12h-2.4c.1-1.7 1-3 2.8-3.8V6.5Z"
    fill="currentColor"
    stroke="none"
  />
));

/* Actions */
export const DownloadIcon = makeIcon('DownloadIcon', (
  <>
    <path d="M12 4v10" />
    <path d="m8 10.5 4 4 4-4" />
    <path d="M5 19.5h14" />
  </>
));
export const PrinterIcon = makeIcon('PrinterIcon', (
  <>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </>
));
export const PlusIcon = makeIcon('PlusIcon', (
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
));
export const EditIcon = makeIcon('EditIcon', (
  <>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </>
));
export const TrashIcon = makeIcon('TrashIcon', (
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>
));
export const RefreshCwIcon = makeIcon('RefreshCwIcon', (
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </>
));
export const HomeIcon = makeIcon('HomeIcon', (
  <>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </>
));
export const AlertTriangleIcon = makeIcon('AlertTriangleIcon', (
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
));
export const EyeIcon = makeIcon('EyeIcon', (
  <>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>
));
export const EyeOffIcon = makeIcon('EyeOffIcon', (
  <>
    <path d="m4 4 16 16" />
    <path d="M9.7 6.2A9.9 9.9 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17.6 17.6 0 0 1-3.3 4" />
    <path d="M6.5 8.1A17.4 17.4 0 0 0 2.5 12S6 18.2 12 18.2c1.2 0 2.3-.2 3.3-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>
));
export const UserIcon = makeIcon('UserIcon', (
  <>
    <circle cx="12" cy="8.4" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>
));
export const LogOutIcon = makeIcon('LogOutIcon', (
  <>
    <path d="M9.5 20H6.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
    <path d="m15 8 4 4-4 4" />
    <path d="M19 12H9.5" />
  </>
));
export const AwardIcon = makeIcon('AwardIcon', (
  <>
    <circle cx="12" cy="9" r="5.2" />
    <path d="m8.6 13.4-1.6 7.1 5-2.6 5 2.6-1.6-7.1" />
  </>
));

/* Facilities (gallery / highlights) */
export const CarIcon = makeIcon('CarIcon', (
  <>
    <path d="M4 15.5v-3l1.9-4.3A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.8 1.2L20 12.5v3" />
    <path d="M4 12.5h16" />
    <circle cx="7.5" cy="16.8" r="1.7" />
    <circle cx="16.5" cy="16.8" r="1.7" />
    <path d="M4 15.5v2.2" />
    <path d="M20 15.5v2.2" />
  </>
));
export const WavesIcon = makeIcon('WavesIcon', (
  <>
    <path d="M3 8.5c1.5 0 2.5-1 4.5-1s3 1 4.5 1 2.5-1 4.5-1 3 1 4.5 1" />
    <path d="M3 13c1.5 0 2.5-1 4.5-1s3 1 4.5 1 2.5-1 4.5-1 3 1 4.5 1" />
    <path d="M3 17.5c1.5 0 2.5-1 4.5-1s3 1 4.5 1 2.5-1 4.5-1 3 1 4.5 1" />
  </>
));
export const TrophyIcon = makeIcon('TrophyIcon', (
  <>
    <path d="M8 4.5h8v5.2a4 4 0 0 1-8 0V4.5Z" />
    <path d="M8 5.8H5.6a2.4 2.4 0 0 0 2.6 3.9" />
    <path d="M16 5.8h2.4a2.4 2.4 0 0 1-2.6 3.9" />
    <path d="M12 13.7v3.3" />
    <path d="M8.6 20h6.8" />
    <path d="M10 17h4l.6 3H9.4L10 17Z" />
  </>
));
export const DumbbellIcon = makeIcon('DumbbellIcon', (
  <>
    <path d="M4 9.5v5" />
    <path d="M7 7v10" />
    <path d="M17 7v10" />
    <path d="M20 9.5v5" />
    <path d="M7 12h10" />
  </>
));
export const WifiIcon = makeIcon('WifiIcon', (
  <>
    <path d="M4.5 10.5a11 11 0 0 1 15 0" />
    <path d="M7.8 14a6.5 6.5 0 0 1 8.4 0" />
    <path d="M10.7 17.2a2.4 2.4 0 0 1 2.6 0" />
  </>
));
export const ZapIcon = makeIcon('ZapIcon', <path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12L13 3Z" />);

/* Social (footer) */
export const InstagramIcon = makeIcon('InstagramIcon', (
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
  </>
));
export const LinkedinIcon = makeIcon('LinkedinIcon', (
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8 10.5V17" />
    <path d="M8 7.4v.1" />
    <path d="M12 17v-4a2.4 2.4 0 0 1 4.8 0v4" />
    <path d="M12 10.5V17" />
  </>
));
export const YoutubeIcon = makeIcon('YoutubeIcon', (
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="m10.5 9.8 4.5 2.7-4.5 2.7V9.8Z" fill="currentColor" stroke="none" />
  </>
));
