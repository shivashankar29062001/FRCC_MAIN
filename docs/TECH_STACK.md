# FRCC Tech Stack Documentation

This document provides a comprehensive overview of the technologies, libraries, architecture, and developer workflows used across the Film Recreation & Cultural Centre (FRCC) platform.

---

## 1. Core Framework & Versions

- **Frontend Framework**: **React 19** (`react` / `react-dom` version `^19.2.8`)
  - Modern Single-Page Application (SPA) architecture utilizing React Functional Components, Hooks, and React Context.
- **Build & Development Framework**: **Vite 8** (`vite` version `^8.3.0`, `@vitejs/plugin-react` version `^6.1.1`)
  - Next-generation dev server with Fast Refresh (HMR) and optimized production asset bundling.
- **Auxiliary Backend Framework**: **Node.js + Express 5** (`express` version `^5.2.1`)
  - Lightweight REST API server running on port `5005` for auxiliary services and local testing.

---

## 2. Dependencies & Purpose (`package.json`)

### Production Dependencies (`dependencies`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`@supabase/supabase-js`** | `^2.118.0` | Official client SDK for Supabase authentication, PostgreSQL queries, RPC execution, and storage operations. |
| **`jspdf`** | `^4.2.1` | Client-side PDF generation engine for downloadable booking receipts and official membership application forms. |
| **`leaflet`** | `^1.9.4` | Open-source mapping library for rendering interactive venue maps with custom styled pins. |
| **`lucide-react`** | `^1.67.0` | Clean, modern SVG icon set used across all navigation, cards, alerts, and booking interfaces. |
| **`qrcode`** | `^1.5.4` | Generates QR code images and data URLs for inclusion in membership application PDFs and digital passes. |
| **`qrcode.react`** | `^4.2.0` | React component for rendering interactive SVG and canvas QR code passes in booking workflows. |
| **`react`** | `^19.2.8` | Core React library for building declarative UI components and managing application state. |
| **`react-dom`** | `^19.2.8` | DOM rendering package providing client mounting (`createRoot`) and browser DOM tree synchronization. |
| **`react-router-dom`** | `^7.18.4` | Client-side routing engine enabling declarative route matching, nested layouts, and route guards. |

### Development Dependencies (`devDependencies`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`@types/react`** | `^19.2.18` | TypeScript type definitions and IntelliSense completions for React components and hooks. |
| **`@types/react-dom`** | `^19.2.7` | TypeScript type definitions for DOM rendering functions and browser event handlers. |
| **`@vitejs/plugin-react`**| `^6.1.1` | Official Vite plugin providing React Fast Refresh and JSX transformation support. |
| **`autoprefixer`** | `^10.6.1` | PostCSS plugin that parses CSS and injects vendor prefixes for cross-browser compatibility. |
| **`oxlint`** | `^1.81.0` | High-performance Rust-based linter enforcing React hooks and code quality rules. |
| **`postcss`** | `^8.5.29` | CSS processing tool that compiles Tailwind utility directives into standard CSS. |
| **`tailwindcss`** | `^3.4.19` | Utility-first styling framework configured with FRCC custom brand tokens and typography. |
| **`vite`** | `^8.3.0` | Fast build tool and development server providing local dev proxy and production asset compilation. |

### Auxiliary Backend Dependencies (`server/package.json`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`express`** | `^5.2.1` | Minimalist web application framework serving auxiliary `/api` endpoints. |
| **`cors`** | `^2.8.6` | Middleware enabling Cross-Origin Resource Sharing between Vite frontend and Express server. |
| **`jsonwebtoken`** | `^9.0.3` | JWT implementation for creating and verifying auxiliary API authentication tokens. |
| **`twilio`** | `^6.2.0` | Node.js helper library for testing Twilio SMS and WhatsApp notifications. |

---

## 3. Build Tool & Bundler

- **Build Engine**: **Vite 8** (`vite.config.js`)
  - Configured with `@vitejs/plugin-react` for JSX transformation and Fast Refresh.
  - Production build command `vite build` bundles JavaScript, CSS, and static assets into the `dist/` folder.
  - Supports dynamic base paths via `VITE_BASE_PATH` (configured for GitHub Pages deployment under `/FRCC_MAIN/`).
  - Configured with a development proxy forwarding `/api` requests to `http://127.0.0.1:5005` when running the Express server.
- **Linter**: **Oxlint** (`.oxlintrc.json`) configured with `react` and `oxc` rules for fast static code analysis (`npm run lint`).

---

## 4. Styling Approach

- **Styling Architecture**: **Tailwind CSS (`v3.4.19`)** utility-first CSS supplemented with `@layer components` design system tokens.
- **Configuration & Tokens (`tailwind.config.js`)**:
  - **Color Palette**: Brand-aligned custom colors:
    - Navy: Primary dark palette (`#0F1F3D`, `#0B1D3A`, `#13294D`, etc.).
    - Gold: Accent palette (`#C9A227`, `#E6C860`, `#A8841A`, etc.).
    - Cream: Background canvas (`#FAF7F0`).
  - **Typography**: Custom fonts configured via Google Fonts CDN in `index.html`:
    - `font-display`: Fraunces (`"Fraunces", "Georgia", serif`)
    - `font-serif`: Playfair Display (`"Playfair Display", "Georgia", serif`)
    - `font-sans`: Inter (`'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'`)
  - **Background Grids & Shadows**: Custom utilities (`grid-navy`, `grid-gold`, `shadow-card`, `shadow-lift`).
- **Global Stylesheet (`src/index.css`)**:
  - Integrates `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`.
  - Defines reusable layout, type hierarchy, and card component abstractions (`.container-x`, `.h-display`, `.eyebrow`, `.card`, `.panel-tint`).

---

## 5. Routing Library & Structure

- **Routing Engine**: **React Router DOM (`v7.18.4`)** (`src/App.jsx`)
  - Utilizes `<BrowserRouter basename={import.meta.env.BASE_URL}>` to support nested base paths seamlessly in development and production hosting.
  - Provides declarative navigation across all primary club verticals:
    - Public routes: Landing (`/`), Sign Up (`/signup`), Sign In (`/signin`), Gallery (`/gallery`), Leadership (`/leadership`), Legal & Policy pages.
    - Protected routes (`<RequireAuth>`): Home Hub (`/home`), Profile (`/profile`), My Bookings (`/my-bookings`, `/profile/bookings`), Support (`/support`), Membership Dashboard (`/membership/dashboard`).
    - Service booking flows: Stay / Hotel (`/stay`, `/book/stay`), Dining & Table Booking (`/dining`, `/dining/book`), Convention Halls (`/convention/book`, `/convention/date`, `/convention/details`, `/convention/payment`), Parking (`/parking/book`), Activities (`/book/activity`).
  - GitHub Pages deep linking supported by generating `dist/404.html` from `dist/index.html` during CI/CD build.

---

## 6. Backend & API Connections

### A. Primary Backend: Supabase (BaaS)
- **Client Connection (`src/services/supabase.js`)**:
  - Initialized with `createClient` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Database (PostgreSQL 17)**:
  - Authoritative data store for bookings, profiles, convention halls, events, and table reservations.
  - Protected by strict Row Level Security (RLS) policies.
  - Enforces booking validation and integrity via `SECURITY DEFINER` PL/pgSQL RPCs:
    - `get_hall_availability(p_hall_id, p_date)`
    - `create_hall_booking(...)`
    - `confirm_hall_booking(...)`
    - `expire_hall_hold(...)`
    - `mark_hall_booking_paid(...)`
    - `cancel_hall_booking(...)`
  - Utilizes PostgreSQL `btree_gist` extension with exclusion constraints (`tstzrange`) to prevent double-booking of halls.
- **Authentication**:
  - Supabase Auth handles user registration, session persistence (`persistSession: true`), auto-refresh tokens, and profile synchronization in `public.profiles`.
- **Storage**:
  - Supabase Storage buckets configured for membership documents and media uploads.
- **Supabase Edge Functions (Deno / TypeScript)**:
  - `send-booking-confirmation`: Server-side notification handler dispatching emails via Resend, SMS via Textlocal, and WhatsApp messages via Meta Cloud API (with log-only fallback when secrets are unset).
  - `issue-refund`: Server-side refund handler invoking the Razorpay Refunds API.

### B. Auxiliary Local Backend (`/server`)
- **Express API Server (`server/index.js`)**:
  - Runs on port `5005` (proxied by Vite through `/api`).
  - Backed by local file database `server/data.json` via `server/db.js`.
  - Exposes `/api/parking`, `/api/bookings`, `/api/payments`, `/api/membership`, and `/api/misc` endpoints for auxiliary club operations and testing.

### C. External Third-Party APIs
- **Razorpay**:
  - Client checkout integration via dynamic script loader (`https://checkout.razorpay.com/v1/checkout.js` in `src/services/razorpayService.js`).
  - Backend order creation endpoint `/api/payments/create-order` in `server/routes/payments.js`.
- **Google Maps JavaScript API (`src/services/maps.js`)**:
  - Maps, Places, and Directions service loaded dynamically when `VITE_GOOGLE_MAPS_API_KEY` is present, with zero-config fallbacks (Embed maps, Haversine routing).
- **OpenStreetMap & Leaflet (`src/features/hall/convention/components/VenueMap.jsx`)**:
  - Tile-based interactive map for displaying convention venues.

---

## 7. Folder Structure

```
FRCC_main/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD to GitHub Pages
├── docs/
│   ├── TECH_STACK.md           # This tech stack documentation
│   └── *.sql                   # Schema reference and migration docs
├── public/                     # Static assets (images, documents, favicons)
├── scripts/
│   └── dev.mjs                 # Concurrent dev runner (Vite + Express)
├── server/                     # Auxiliary Express API server
│   ├── routes/                 # Express API routes (bookings, payments, etc.)
│   ├── data.json               # JSON mock/seed database
│   ├── db.js                   # JSON datastore controller
│   ├── index.js                # Express server entry point
│   └── package.json            # Server dependencies (Express, CORS, Twilio)
├── src/                        # React frontend source code
│   ├── app/                    # Store (AppContext.jsx), session, and route guards
│   ├── assets/                 # Brand graphics, icons, logos
│   ├── components/             # Reusable UI controls, layout chrome, error boundaries
│   ├── config/                 # App configuration (routes, pricing, site info)
│   ├── data/                   # Catalogs (activities, dining, events, halls, hotel)
│   ├── features/               # Domain feature modules (activities, dining, hall, hotel, parking)
│   ├── lib/                    # Client libraries (PDF application form generation)
│   ├── pages/                  # Top-level page views (Landing, Auth, Profile, Support)
│   ├── services/               # Integrations (Supabase, Razorpay, Google Maps)
│   ├── utils/                  # Formatting, mobile validation, vehicle parsing, receipt generator
│   ├── App.jsx                 # Main application component & route configuration
│   ├── index.css               # Tailwind CSS entry & custom classes
│   └── main.jsx                # Application root mount
├── supabase/                   # Supabase configuration & migrations
│   ├── config.toml             # Local Supabase CLI configuration
│   ├── functions/              # Edge Functions (issue-refund, send-booking-confirmation)
│   ├── migrations/             # PostgreSQL database migrations
│   └── prechecks/              # Pre-migration audit SQL scripts
├── .oxlintrc.json              # Oxlint linter rules
├── index.html                  # HTML entry point with font preconnects
├── package.json                # Project dependencies and npm scripts
├── postcss.config.js           # PostCSS Tailwind and Autoprefixer plugins
├── tailwind.config.js          # Tailwind design tokens and theme configuration
└── vite.config.js              # Vite build and dev server proxy settings
```

---

## 8. How to Run and Build Locally

### Prerequisites
- **Node.js**: Version 20+ recommended (`node -v`)
- **npm**: Version 10+ (`npm -v`)

### Installation
Install project dependencies from the repository root:
```bash
npm install
```
*(Optional: If working on auxiliary server scripts independently, run `cd server && npm install`)*

### Development
1. **Run full stack (Frontend + Auxiliary API Server)**:
   ```bash
   npm run dev:all
   ```
   - Launches the Express API server on `http://localhost:5005`.
   - Launches the Vite React frontend on `http://localhost:5174`.
   - Proxies `/api` requests from Vite to Express automatically.

2. **Run frontend only**:
   ```bash
   npm run dev
   ```
   - Starts only the Vite development server on `http://localhost:5174`.
   - Supabase-backed features (Auth, PostgreSQL RPCs) connect directly to the cloud Supabase project.

3. **Run auxiliary Express server only**:
   ```bash
   npm run server
   ```
   - Starts only the Node.js Express API on `http://localhost:5005`.

### Linting
Run static code analysis using Oxlint:
```bash
npm run lint
```

### Production Build & Preview
1. **Build for production**:
   ```bash
   npm run build
   ```
   - Compiles client assets into the `dist/` directory using Vite and Tailwind.

2. **Preview production build locally**:
   ```bash
   npm run preview
   ```
   - Starts a local static web server serving the compiled files from `dist/`.

