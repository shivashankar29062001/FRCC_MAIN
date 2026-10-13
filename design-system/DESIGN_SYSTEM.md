# FRCC Design System (Phase 1)

Single source of truth for the Hotel / Hall / Parking / Membership teams.
Reuse these tokens and components so redirected pages match the main site.
Brand colors, logo and fonts are reused exactly — no new colors or fonts
(only lighter/darker tints of existing colors, soft borders and shadows).

## 1. Colors (hex + roles)

| Token | Hex | Role |
|---|---|---|
| `navy-950` | `#0A1730` | Dark bands, hero/banner background, footer |
| `navy-900` | `#0B1D3A` | Primary buttons, headings, active nav |
| `navy-800` | `#13294D` | Primary hover, gradients |
| `navy-700` | `#1B3A6B` | Gradients only |
| `navy-100` | `#DCE4F2` | Borders on dark (rare) |
| `navy-50` | `#EFF3FA` | Tinted bands, icon tiles, hovers |
| `gold-600` | `#A9861D` | Eyebrows, links, icons on light |
| `gold-500` | `#C9A227` | Gold CTA background, badges |
| `gold-400` | `#D9BC55` | Eyebrows/icons on dark, stars |
| `gold-100` | `#F5EAC6` | Gold tint backgrounds |
| `gold-50` | `#FBF6E3` | Gold tint panels, featured cards |
| `cream` | `#FAF7F0` | Page background (`body`) |
| white | `#FFFFFF` | Cards, fields |

Status tags only: green (Confirmed/Active/Success), amber (Pending), red
(Cancelled/Error), slate (neutral). Never use status colors for brand.

## 2. Fonts (how to load)

- Display: `Fraunces` (Georgia fallback) — `font-display` — H1/H2/H3, logo, numbers.
- Sans: `Inter` (system-ui fallback) — `font-sans` — body, labels, buttons.
- Load via Google Fonts in `index.html` (already wired on the main site):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

## 3. Type scale

| Class | Use | Size |
|---|---|---|
| `.h-display` | Landing hero | 36–60px display |
| `.h-hero` | Inner page H1 (in PageHeader) | 30–48px display |
| `.h-section` | Section H2 | 24–30px display |
| `.h-sub` | Panel H2 | 20–24px display |
| `.h-card` | Card H3 | 18px display |
| `.eyebrow` / `.eyebrow-on-dark` | Kickers | 11px bold uppercase, 0.22em tracking |
| `.lead` | Intro paragraphs | 16–18px slate-600 |
| `.p-muted` | Body secondary | slate-600 relaxed |
| `.caption` | Hints, meta | 12px slate-500 |

## 4. Spacing / radius / shadows / breakpoints

- Layout: `.container-x` (max-w-7xl), `.container-narrow` (max-w-4xl), `.section` (py 56–80px), `.section-sm` (py 36–48px).
- Bands alternate: `.band-white` → `.band-cream` → `.band-tint` → `.band-dark`.
- Radius: cards/panels `rounded-2xl` (16px), buttons/inputs `rounded-xl` (12px), tags `rounded-full`.
- Shadows: `shadow-card` (rest), `shadow-lift` (hover, `-translate-y-1` via `.card-hover`).
- Breakpoints (Tailwind default): `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Mobile-first.

## 5. Component styles

- **Button** (`.btn-base` + variant): primary navy-900/white; gold gold-500/navy-950;
  outline white/navy border; ghost text; light (on dark); danger red. Sizes sm/md/lg.
- **Input** (`.field` + `.label` + `.field-error`): 12px radius, slate-300 border,
  navy-800 focus ring, inline error, show/hide password toggle.
- **Card** (`.card` + `.card-hover`): white, 16px radius, soft shadow, hover lift.
- **Badge/Tag** (`.tag` + tone): 11px bold uppercase pill — gold, navy, green,
  amber, red, slate, on-dark.
- **PageHeader**: navy-950 banner, breadcrumb, eyebrow-on-dark, H1, intro, tags.

## 6. Motion / a11y

- Subtle scroll reveal (`.reveal` → `.is-visible`, stagger via `--reveal-delay`),
  card hover lift, navbar shrink on scroll. All disabled under
  `prefers-reduced-motion`.
- Contrast: body text slate-800 on cream; white on navy-950 passes AAA.
- Visible focus rings (`outline: 2px solid #0B1D3A`), labels on all fields,
  keyboard-operable menus/accordion/tabs, `aria-live` toasts.

## 7. Files in this package

| File | What |
|---|---|
| `tokens.css` | CSS variables + the same component classes as the main site |
| `tailwind.tokens.js` | Drop-in `theme.extend` for Tailwind (navy/gold/cream, fonts, shadows) |
| `components/*.jsx` | Standalone Navbar, Footer, Button, Input, Card, Badge, PageHeader |
| `page-template.jsx` | Blank inner page built from them |
| `activities-booking-template.jsx` | Activities booking page (same Navbar, Footer, PageHeader, Button, Input, Card, Badge; reads `?game=<id>`) |

## 8. Usage (other team)

1. Copy `tokens.css` + `tailwind.tokens.js` into your app (or import the classes).
2. Copy `components/` — same links (`/`, `/home`, `/book/*`, `/membership`,
   `/profile`, `/membership/dashboard`, `/support`, `/signin`, `/signup`),
   same logo, same logged-in/logged-out states via `user` + `isMember` props.
3. Build new pages from `page-template.jsx`.
4. Mock data only, no backend yet. Image slots come from the main site's
   `/src/config/images.js`; redirect buttons use `/src/config/redirects.js`.
