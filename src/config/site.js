// ---------------------------------------------------------------------------
// /src/config/site.js — Site configuration
// ---------------------------------------------------------------------------

import { MEMBER_DISCOUNT_PERCENT, MEMBER_PROMO_NOTE } from './pricing.js';

export const name = 'Film Recreation & Cultural Centre';
export const shortName = 'FRCC';
export const tagline = 'Reel stories... real connections...';

export const phone = '+91 78936 16262';
export const whatsappNumber = '917893616262';
export const whatsappLink = 'https://wa.me/917893616262';
export const whatsappTarget = 'member'; // 'member' | 'club'
export const autoRedirectToWhatsApp = false;

export const memberDiscountPercent = 30; // 30% discount on every booking
export const healthCardDiscountPercent = 20; // 20% discount at selected diagnostic centres
export const memberPromoNote = MEMBER_PROMO_NOTE;

// Registered office address
export const address = 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003';

// Hyderabad branch office address
export const hyderabadAddress = 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081';

// All locations
export const locations = [
  {
    id: 'vja',
    name: 'Vijayawada',
    title: 'Vijayawada (Registered Office)',
    address: 'D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003',
    state: 'Andhra Pradesh',
    pincode: '520003',
    isDefault: true,
  },
  {
    id: 'hyd',
    name: 'Hyderabad',
    title: 'Hyderabad Office',
    address: 'Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081',
    state: 'Telangana',
    pincode: '500081',
    isDefault: false,
  },
];

// SAMPLE values — replace with verified client values when available
export const email = 'hello@frcc.example'; // SAMPLE
export const hours = 'Front desk open 6 AM – 11 PM daily'; // SAMPLE

export const contact = {
  phone,
  whatsappNumber,
  whatsappLink,
  email, // SAMPLE
  address,
  hyderabadAddress,
  locations,
  hours, // SAMPLE
};

export const club = {
  whatsappNumber,
  whatsappLink,
};

export const siteConfig = {
  name,
  shortName,
  tagline,
  phone,
  whatsappNumber,
  whatsappLink,
  contact,
  memberDiscountPercent,
  healthCardDiscountPercent,
  memberPromoNote,
  whatsappTarget,
  club,
  autoRedirectToWhatsApp,
  address,
  hyderabadAddress,
  locations,
  email, // SAMPLE
  hours, // SAMPLE
};

export default siteConfig;
