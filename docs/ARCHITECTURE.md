# Decorbeats — System Architecture & Technical Specifications

## 1. System Overview
Decorbeats is built as a fast, lightweight Single Page Application (SPA) powered by Vite and React 18, utilizing Supabase for backend relational persistence, storage, and authentication, with Vercel for static distribution and serverless API execution.

```
                  ┌─────────────────────────────────────────┐
                  │          Vercel CDN / Edge              │
                  │   https://www.decorbeats.com            │
                  └───────┬─────────────────────────┬───────┘
                          │                         │
               Browser SPA Request           Serverless API Calls
                          │                         │
                  ┌───────▼───────┐          ┌──────▼──────┐
                  │  Vite SPA     │          │  Vercel     │
                  │  (React 18)   │          │  Functions  │
                  └───────┬───────┘          └──────┬──────┘
                          │                         │
                          └───────────┬─────────────┘
                                      │
                         Direct Supabase Client / RPC
                                      │
                          ┌───────────▼───────────┐
                          │   Supabase Project    │
                          │ (ckmujewooiwplfhjcjdz)│
                          │                       │
                          │  • Postgres + RLS     │
                          │  • Auth & Session     │
                          │  • Storage Buckets    │
                          └───────────────────────┘
```

---

## 2. Frontend Routing Architecture

### Entry Point Dispatcher (`src/main.jsx`)
`src/main.jsx` renders a reactive `Root` component that observes `popstate`, `decorbeats:navigate`, and `hashchange` events:
- **Capture Studio (`src/capture/CaptureApp.jsx`)**: Lazy-loaded under `<Suspense>` when `useCaptureAdmin(pathname, search, hash)` evaluates to `true`.
  - Triggered by `/admin`, `/admin/capture`, query views like `?view=pricing`, and invite/recovery auth tokens (`#type=invite`, `#type=recovery`).
- **Storefront & Legacy Tools (`src/App.jsx`)**: Rendered when `useCaptureAdmin` evaluates to `false`.
  - Customer routes: `/`, `/category/:slug`, `/product/:slug`, `/catalogue/:slug`.
  - Legacy admin tools: explicitly scoped to `/admin?legacy=1`.

### Route Decision Logic (`src/adminRoute.js`)
```javascript
export function useCaptureAdmin(pathname, search = '', hash = '') {
  const isAuthAction = typeof hash === 'string' && /type=(?:invite|recovery)/.test(hash);
  if (isAuthAction) return true;
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  return path === '/admin/capture' || (path === '/admin' && new URLSearchParams(search).get('legacy') !== '1');
}
```

---

## 3. Database Schema & Functions

### Core Tables
1. **`products`**:
   - Primary catalog of all brass handicrafts.
   - Authority on `quantity` (available sellable stock) and live pricing (`price`, `mrp`, `cost_price`).
   - Media URLs: `image_url` (hero), `image_urls` (JSON array of gallery images), `video_urls` (JSON array of turntable video clips).
2. **`capture_drafts`**:
   - Private working drafts created during photography sessions.
   - Includes before/after state snapshots, measurement metadata, count details across locations, and status (`draft`, `published`).
   - Concurrency revision lock on `revision`.
3. **`stock_intake`**:
   - Stock movement audit trail: `arrival`, `dispatch`, `count`.
   - Before and after quantities recorded; approvals update `products.quantity` atomically.
4. **`admins`**:
   - Admin email allowlist. Joined against Supabase `auth.users.email` by `is_decorbeats_admin()`.

### Key PostgreSQL Functions (RPCs)
- `is_decorbeats_admin()`: Returns `boolean` verifying the authenticated user is an authorized application admin.
- `publish_capture_draft_v1(p_id, p_revision)`: Atomically reconciles stock, listing details, prices, and media URLs into `products` and marks the draft as published.
- `submit_stock_intake_v1(...)`: Submits a pending stock intake entry with before-quantities captured.
- `review_stock_intake_v1(...)`: Approves or rejects a pending stock movement with row locking and revision protection.
- `find_inventory_matches_v1(...)`: High-speed keyword search against name, SKU, and category without consuming AI tokens.

---

## 4. Storage Buckets & Policies
1. **`capture-originals`**:
   - Private bucket containing uncompressed high-resolution raw camera uploads from staff.
   - Read/write access strictly restricted to authenticated application admins.
2. **`products`**:
   - Public bucket serving processed web assets.
   - Standard path structure: `products/capture/<draft-id>/...`
   - Assets are WebP format fitted to 1600 × 1600 px for optimal mobile load performance.
   - Turntable videos stored as MP4/H.264 up to 45 MB.

---

## 5. WhatsApp & Social Sharing Metadata
- Initial HTML (`index.html`) contains static OpenGraph and Twitter cards so link crawlers without JavaScript execution display rich previews:
  - **Title**: `Decorbeats | Brass Handicrafts, Home Décor & Gifts`
  - **Description**: `Discover brass handicrafts, home décor and thoughtful gifts. Explore diyas, idols, statement pieces and more for your home and celebrations.`
  - **Image**: `https://www.decorbeats.com/assets/brand/decorbeats-share-v1.jpg` (1200 × 630 px, ~38 KB).
  - **Script**: `scripts/render-share-card.cjs` (uses Sharp to compose the high-contrast brand card).
  - **Test**: `tests/sharePreview.test.js`.
