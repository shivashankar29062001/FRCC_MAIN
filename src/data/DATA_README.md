# Film Recreation & Cultural Centre (FRCC) — Data Specifications & Pending Inputs

This document details the exact data model for FRCC and lists all **pending client inputs** required to replace remaining sample assumptions.

---

## ⚠️ What Is Still Missing (Pending Client Inputs)

The following 4 items require official client confirmation and details:

1. **Room Counts (`src/data/hotel.js`)**:
   - Exact room inventory available for each room type in Vijayawada:
     - Standard Room (Normal tier, ₹2,500/night) — currently SAMPLE: 10
     - Deluxe Room (Normal tier, ₹3,500/night) — currently SAMPLE: 12
     - Premium Room (Normal tier, ₹4,500/night) — currently SAMPLE: 8
     - Junior Suite (Suite tier, ₹6,000/night) — currently SAMPLE: 6
     - Executive Suite (Suite tier, ₹8,000/night) — currently SAMPLE: 4
     - Royal Suite (Suite tier, ₹10,000/night) — currently SAMPLE: 2

2. **Hall AC / Non-AC Status (`src/data/halls.js`)**:
   - Confirmation whether the **Function Hall** (₹1,500/person with food) is Central AC or Non-AC / open pavilion.
   - Confirmation of AC classification and AV setup for the **Meeting Hall** (₹1,600/hr boardroom).
   - *Status*: Currently marked AC (SAMPLE).

3. **GST Rates across all services**:
   - Exact Goods & Services Tax (GST) percentages applicable for:
     - Hotel stays (GST not confirmed; `taxPercent` is currently omitted)
     - Function Hall & Meeting Hall bookings
     - Sports, Games & Luxury Gym memberships
     - Membership enrollment fees
   - *Status*: GST not confirmed by client.

4. **Collaborating Diagnostic Centres List (`src/data/membership.js`)**:
   - Directory of diagnostic centres collaborating with FRCC to offer the **30% Health Card discount** to members (centre name, address, contact, and qualifying tests).
   - *Status*: Initialized as an empty array `diagnosticCentres: []` (list not provided yet).

---

## 📍 Club Location

FRCC operates a single flagship destination in **Vijayawada, Andhra Pradesh**:
- **Campus / Area ID**: `'vja'` (`Vijayawada`)
- *Note*: Secondary city regions (e.g. Hyderabad, Amaravati) have been removed from active inventory and selectors are hidden everywhere. The underlying `areas: [{ id: 'vja', name: 'Vijayawada' }]` array structure is kept so it can grow later.

---

## 🏢 Site & Contact Details (`src/config/site.js` & `src/config/siteInfo.js`)

- **Club Name**: Film Recreation & Cultural Centre
- **Short Name**: FRCC
- **Tagline**: *Reel stories... real connections...*
- **Registered Office Address (Vijayawada)**:
  `D.No. 24-29-210A, Durgapuram, Gulabithota Road, Vijayawada, NTR District, Andhra Pradesh – 520003`
- **Hyderabad Branch Office Address**:
  `Second Floor, Samridhi Vasyam, D No 1/98/9/3/23, Capital Pk Rd, Above Axis bank Image gardens branch, Jaihind Enclave, Madhapur, Hyderabad, Telangana 500081`
- **Official Telephone**: `+91 78936 16262`
- **WhatsApp Desk**: `917893616262` (footer/contact plain link: `https://wa.me/917893616262`)
- **Member Discounts**:
  - `memberDiscountPercent`: **30%** on bookings across club facilities
  - `healthCardDiscountPercent`: **30%** at collaborating diagnostic centres
- **Support Email**: `hello@frcc.example` *(SAMPLE)*
- **Hours**: `Front desk open 6 AM – 11 PM daily` *(SAMPLE)*

---

## 🛏️ Hotel Tariff Specifications (`src/data/hotel.js`)

Tariff is price per night (per day). Indian Rupee formatting (`formatInr()`) is applied across all price displays. No `taxPercent` (GST not confirmed).

- **Normal Category** (Range ₹2,500 to ₹4,500):
  - Standard Room: ₹2,500 / night
  - Deluxe Room: ₹3,500 / night
  - Premium Room: ₹4,500 / night
- **Suite Category** (Range ₹4,500 to ₹10,000):
  - Junior Suite: ₹6,000 / night
  - Executive Suite: ₹8,000 / night
  - Royal Suite: ₹10,000 / night

---

## 🏛️ Halls & Banquets (`src/data/halls.js`)

- **Function Hall**:
  - `pricingUnit`: `"per-person"`
  - `price`: ₹1,500 per person
  - `includesFood`: `true` (wording *"with food"*)
  - `capacityMin`: 30
  - `capacityMax`: 1,00,000
  - `type`: `"ac"` *(AC/Non-AC SAMPLE)*
- **Meeting Hall**:
  - `pricingUnit`: `"per-hour"`
  - `price`: ₹1,600 per hour
  - `type`: `"boardroom"`
  - `capacity`: 50 guests *(SAMPLE)*
  - `type`: AC/Non-AC SAMPLE

---

## 🏸 Activities & Fitness (`src/data/activities.js`)

- **Indoor & Outdoor Games**:
  - Badminton, Tennis, Cricket, Table Tennis, Volleyball, Chess, Carom, Golf, Kids Play Area, Football:
    - `pricingUnit`: `"per-session"`
    - `price`: ₹1,500 per session
    - `slotMinutes`: 60 *(SAMPLE)*
- **Swimming Pool**:
  - `pricingUnit`: `"per-hour"`
  - `price`: ₹1,000 per hour
- **Luxury Gym** (`category: "fitness"`):
  - `pricingUnit`: `"per-month"`
  - `priceFrom`: ₹2,000
  - `priceTo`: ₹3,000
  - Tiers:
    - Standard: ₹2,000 / month *(SAMPLE)*
    - Premium: ₹3,000 / month *(SAMPLE)*

---

## 🚗 Parking (`src/data/parking.js`)

- **Status**: Free / Complimentary parking across campus
- `price`: ₹0
- `isFree`: `true`
- `vehicleTypes`: `['car', 'bike']`
- `spots`: 150 bays *(SAMPLE)*

---

## 💳 Membership (`src/data/membership.js`)

Single plan shown as a centred card:
- **ID**: `"frcc-membership"`
- **Plan Name**: `"FRCC Membership"`
- **Price**: ₹1,00,000 *(one-time)*
- **Validity**: `"lifetime"`
- **Benefits**:
  1. 30% discount on every booking
  2. Health card: 30% discount at collaborating diagnostic centres
  3. Membership ID card and Health card
- **Diagnostic Centres**: `[]` *(empty, list not provided yet)*
- **Health Card Note**: *"Discount valid only at diagnostic centres collaborating with FRCC."*

---

## 💰 Indian Currency Formatting Standard (`formatInr`)

All prices across the application use the unified helper `formatInr()` located in `src/utils/pricing.js`:
- Follows the Indian numbering grouping system: `₹1,00,000`, `₹2,500`, `₹1,500`.
- Supports negative numbers (e.g. member discounts `-₹300`).
- Re-exported as `formatINR` for backward compatibility across existing activity and profile components.
