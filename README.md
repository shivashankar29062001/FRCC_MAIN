# FRCC — Facility & Membership Platform · Phase 1 Front-End Skeleton

**Type:** Club / Resort / Society website + member portal
**Stack:** React 19 + Vite + Tailwind v3 + React Router 7 · mock data only, no backend
**Brand:** premium, clean, modern — navy `#0B1D3A` / gold `#C9A227` / cream `#FAF7F0`, Fraunces display + Inter body

One account → Hotel, Convention Hall, Parking, Membership (each on a **separate team's page**, linked by URL) + **Activities/Games booked in-app** (5-step flow, dummy submit).

## 1. Run

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build
npm run lint     # oxlint
```

Mock flow: Landing → **Sign up** → **Sign in** → `/home` → pick a service.

> Configuring the four team pages? Edit **one file**: `src/config/redirects.js`.

## 2. Folder structure

```
src/
├─ config/
│  └─ redirects.js            ★ HOTEL/HALL/PARKING/MEMBERSHIP URLs + OPEN_IN_NEW_TAB + openTeamPage()
├─ app/
│  ├─ session.js              ★ THE ONE place session logic lives (login flag, user id) — shareable
│  ├─ store/AppContext.jsx    # global mock state: user, bookings, payments, membership, toasts
│  ├─ hooks/useMockQuery.js   # loading → empty/error (with retry) for every data page
│  └─ routes/ProtectedRoute.jsx  # guards pages 4–11 (requires mock login)
├─ components/
│  ├─ layout/chrome.jsx       # Navbar (logged-out vs logged-in) + Footer + AppLayout
│  ├─ RedirectIntro.jsx       # shared intro + single button for the team-owned services
│  └─ ui/
│     ├─ controls.jsx         # Button, Input, Select, DatePicker, TextArea
│     └─ feedback.jsx         # Card, SectionHeading, EmptyState, LoadingState, ErrorState,
│                             # StatusTag, Modal, Toasts
├─ features/
│  ├─ hotel/    HotelPage.jsx (intro + "Book Hotel")   · hotel.jsx   = empty stub (other team)
│  ├─ hall/     HallPage.jsx   (intro + "Book Hall")   · hall.jsx    = empty stub (other team)
│  ├─ parking/  ParkingPage.jsx(intro + "Book Parking")· parking.jsx = empty stub (other team)
│  ├─ membership/MembershipPage.jsx (intro + benefits + "Get Membership") · membership.jsx = empty stub
│  └─ activities/             ★ showcase + 6-step booking flow (separate page)
│     ├─ ActivitiesPage.jsx   # redirect-only intro: 11 game cards + filters → ACTIVITIES_BOOKING_URL (?game=<id>)
│     ├─ ActivitiesProcessPage.jsx # booking page: game → date → slot → details → pay (mock) → confirmation
│     ├─ games.config.js      # single source of truth: 11 games, pricing, rules
│     ├─ availability.service.js # mock slot availability per game + date
│     └─ bookings.store.js    # mock booking store (one localStorage key) + hook
├─ pages/
│  ├─ LandingPage.jsx   # Hero, Facilities, Events, Sign up / Sign in
│  ├─ AuthPages.jsx     # SignupPage (Name, Mail/Mobile, Password) · SigninPage (+ Forgot Password stub)
│  ├─ HomeHubPage.jsx   # 11 sections + 5 service cards
│  ├─ DashboardPage.jsx # Membership Details, My Bookings, Payment History, Member ID/QR
│  ├─ SupportPage.jsx   # Contact form + Support Ticket form (dummy submit)
│  └─ SystemPages.jsx   # 404 + /logout
├─ data/mock.js         # shared mock data (PAYMENT_METHODS only in Phase 1)
├─ utils/helpers.js     # cx, bookingTitle, todayISO
└─ index.css            # Tailwind layers + .container-x/.card/.field/.label utilities
```

★ = the files the other teams need to touch (URLs only) or share (session).

## 3. Route map

| # | Page | Route | Auth | Phase 1 behaviour |
|---|------|-------|------|-------------------|
| 1 | Landing | `/` | public | Hero, Facilities, Events, **Sign up** + **Sign in** buttons |
| 2 | Sign Up | `/signup` | public | Name, Mail/Mobile, Create Password → **Create Account** (mock, then → sign in) |
| 3 | Sign In | `/signin` | public | Mail/Mobile, Password, Forgot Password (stub) → **Login** → `/home` |
| 4 | Homepage / Hub | `/home` | protected | Home · About · Facilities · Activities/Games · Membership · Booking (5 service cards) · Gallery · Contact Us · Profile · Reviews & Ratings · Notifications |
| 5 | Hotel Booking | `/book/hotel` | protected | Intro + image placeholder + **Book Hotel** → `HOTEL_BOOKING_URL` (no steps) |
| 6 | Hall Booking | `/book/hall` | protected | Intro + **Book Hall** → `HALL_BOOKING_URL` (no steps) |
| 7 | Parking Booking | `/book/parking` | protected | Intro + **Book Parking** → `PARKING_BOOKING_URL` (no steps) |
| 8 | Activities / Games | `/book/activities` | protected | Intro + game cards with **Book Now** → `ACTIVITIES_BOOKING_URL` (?game=\<id\>, no steps) |
| — | Activities booking page | `/book/activities/process` | protected | 6 steps (game → date → slot → details → pay → confirmation), reads `?game=<id>` (internal `ACTIVITIES_BOOKING_URL` for now) |
| 9 | Membership | `/membership` | protected | Intro + benefits + plan highlights (static) + **Get Membership** → `MEMBERSHIP_URL` (no steps) |
| 10 | Dashboard / Profile | `/dashboard` | protected | Membership Details *(placeholder card)* · My Bookings · Payment History · Member ID / QR *(placeholder card)* |
| 11 | Contact / Support | `/support` | protected | Contact form + Support ticket form (dummy submit) |
| 12 | Logout | `/logout` | — | clears mock session → `/` |
| — | 404 | `*` | public | NotFound + links |
| — | `/book` | — | — | redirect → `/home` |

**User flow:** Landing → Sign Up → Sign In → Homepage → (Hotel | Hall | Parking | Activities | Membership → **team/booking pages**) → Profile → Support → Logout.
My Bookings / Payment History in Profile are placeholders until the booking pages send their data back.

**Redirect rules:** all five booking links read from `src/config/redirects.js`. Same tab by default; flip `OPEN_IN_NEW_TAB = true` to open a new tab everywhere. Placeholder `"#"` URLs show a toast instead of dead-linking.

## 4. Reusable pieces

| Component | Where | Used by |
|---|---|---|
| `RedirectIntro` | `components/RedirectIntro.jsx` | Hotel, Hall, Parking, Membership intro pages |
| UI kit | `components/ui/*` | Button, Input, Select, DatePicker, TextArea, Card, Modal, Toast, EmptyState, LoadingState, ErrorState |
| `useMockQuery` | `app/hooks/useMockQuery.js` | loading / error (retry) states on Landing, Hub, Profile, intro pages |
| `session.js` | `app/session.js` | login flag + user id — importable by the other teams' pages |

## 5. TODOs — Phase 2

**Cross-cutting**
- Real auth: `POST /api/auth/{signup,login,logout}` with JWT / httpOnly cookie; OTP + forgot-password flow; replace `session.js` localStorage mock.
- Real API: `GET/POST /api/bookings`, `GET /api/payments`, `GET /api/home`; wire `useMockQuery` to fetch.
- Real payments (Razorpay/Stripe) + webhooks; replace the fake-success step.
- Replace image/QR placeholders with CMS assets and `qrcode.react`.

**Activities / Games (build in depth next)**
- Live slot availability per game/date (disable booked slots), capacity limits, cancellation/reschedule, coach & equipment rental add-ons, group booking, receipts, server-side booking id.

**Dashboard / merged modules**
- Hydrate `Membership Details` + `Member ID / QR` from the membership team's API (`saveMembership` is the integration point).
- Show Hotel / Hall / Parking bookings alongside Activities once those teams merge; paginated history, downloadable receipts.

**Hotel / Hall / Parking / Activities / Membership teams**
- Only `src/config/redirects.js` changes when their pages ship; then delete their empty stub modules (`hotel.jsx`, `hall.jsx`, `parking.jsx`, `membership.jsx`).

**Support**
- Ticket CRUD + attachments + status tracking; contact form → `POST /api/support/contact`.
