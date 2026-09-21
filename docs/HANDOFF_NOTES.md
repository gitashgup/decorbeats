# Decorbeats — Development Handoff & Operating Notes

## 1. Business Objective
Build Decorbeats into a leading Indian brass handicraft, home décor, and gifting business.
The website and backend support one connected workflow:
**Capture products → reconcile inventory → review listings → publish → sell across channels → record stock movements.**

Sales channels include:
- Decorbeats website (`https://www.decorbeats.com`)
- Amazon, FBA, and Seller Flex
- Megha's Instagram & WhatsApp orders
- Walk-in sales (Bengaluru Experience Center)
- Shareable digital catalogues

*Note*: These channels are not all automatically integrated today. Automated integrations require careful milestone development.

---

## 2. People & Responsibilities
- **Ashwarya**: Owner, final listing review, publishing, and stock approval.
- **Pranov / Pranav**: Photographs products, records dimensions, weight, quantity, and storage locations.
- **Megha**: Enters cost and selling prices; records customer inquiries and sales.
- **Vinay**: Granted application admin access matching Ashwarya (`vinayphogat0408@gmail.com`).

*Important*: Fine-grained staff-versus-owner permission separation is not yet enforced at the database level; all users in `public.admins` have application admin access.

---

## 3. Production Source & Infrastructure
- **GitHub Repository**: `https://github.com/gitashgup/decorbeats`
  - Production Branch: `main`
  - Verified Commit at handoff: `1b906f43decf439ef198302a8970f1427ea44da3`
  - Permanent Local Workspace: `/Users/k0d3/Documents/Decorbeats`
- **Stack**:
  - React 18, Vite 5
  - Supabase database, authentication, and storage
  - Vercel hosting and serverless functions (`api/`)
  - Continuous deployment via GitHub pushes to `main`
- **Vercel**:
  - Project: `decorbeats`
  - Team Scope: `ashwaryas-projects-79f8dddd`
  - Domain: `https://www.decorbeats.com`
- **Supabase**:
  - Project Reference: `ckmujewooiwplfhjcjdz`
  - Dashboard: `https://supabase.com/dashboard/project/ckmujewooiwplfhjcjdz`

---

## 4. Local Folder Context & Warnings
- Permanent development folder: `/Users/k0d3/Documents/Decorbeats`
- Historical folders:
  - `/private/tmp/decorbeats-review-table-20260912`
  - `/private/tmp/decorbeats-simple-match-20260915` (retained WhatsApp share assets)
  - `/Users/k0d3/Developer/decorbeats-production` (older/standalone code)
  - `/Users/k0d3/Documents/Codex Testing` (contains uncommitted scratch experiments)
- *Rule*: Never overwrite or deploy uninspected local directories. GitHub `main` is always the starting baseline.

---

## 5. Application Entry Points
| Entry Point | URL | Notes |
|---|---|---|
| Customer Website | `https://www.decorbeats.com/` | Customer-facing storefront |
| Review Dashboard | `https://www.decorbeats.com/admin` | Listing review and publishing |
| Capture & Inventory | `https://www.decorbeats.com/admin/capture` | Product photography station & draft creator |
| Megha Pricing | `https://www.decorbeats.com/admin?view=pricing` | Compact price review table |
| Stock Movements | `https://www.decorbeats.com/admin/capture?view=movements` | Intake: arrival, dispatch, physical count |
| Individual Draft | `https://www.decorbeats.com/admin/capture?draft=<UUID>` | Direct draft editing |
| Older Tools | `https://www.decorbeats.com/admin?legacy=1` | Sales, inquiries, legacy admin screens |

---

## 6. Implemented Functionality
- **Capture & Review**:
  - Photos, measurements, weight, quantities, storage locations.
  - Draft persistence with revision locking.
  - Name, category, material, description, highlights.
  - Link capture to existing product baseline.
  - Publish creates new product or updates existing with reconciled stock.
  - ZIP export with photos and metadata.
- **Existing-Product Matching**:
  - Fast database search by SKU/name/category; zero AI tokens consumed.
- **Inventory Pricing**:
  - Inline cost and selling-price editing with optimistic concurrency checks.
- **Additional Media**:
  - Up to 12 additional edited photos (fitted into 1600×1600 WebP).
  - Up to 6 video clips (turntable rotations, 1080p/30 H.264, max 45 MB, 60s).
- **Stock Movements**:
  - Arrival (adds quantity), Dispatch (subtracts quantity), Physical Count (replaces total quantity with revision check).
  - Row-level locks and duplicate reference protection.

---

## 7. Known Defects & Resolutions
- **Old Admin Routing Trapping Defect (Resolved)**:
  - Previously, `main.jsx` checked `useCaptureAdmin` only once on initial load.
  - Storefront admin link ran `history.pushState('/admin')` and set `publicScreen='admin-auth'`, trapping users in the legacy `App.jsx` admin.
  - Authenticated sessions on `/` were automatically rendered in legacy admin mode.
  - *Fix*: Made `Root` in `main.jsx` reactive to location changes. In `App.jsx`, scoped legacy admin display strictly to `legacy=1`. Direct links and clicks to `/admin` cleanly open Capture Studio.
- **Admin Password Setup & Onboarding (Resolved)**:
  - Previously, invited users (e.g., Vinay) who accepted invitations had no UI to set a reusable password.
  - *Fix*: Added password setup dialog and password reset link in `CaptureApp.jsx`. Invites landing with `#type=invite` or `#type=recovery` automatically open the password setup prompt.

---

## 8. Elephant Pilot Reference
- **Website URL**: `https://www.decorbeats.com/product/db-br-ele-01-s-brass-elephant-set-of-2`
- **ASIN**: `B0D6SYR1YW`
- **Seller SKU**: `1J-8593-GEY3`
- **Website SKU**: `DB-BR-ELE-01-S`
- **Capture Draft UUID**: `a46b22a4-c766-4fb7-9e23-0a681509dd14`
- **Confirmed Specs**: Brass elephant figurines, set of 2; each 6 × 4 × 9 cm; combined weight: 754 g.
- *Policy*: Never publish draft quantities or alter prices without owner recount and explicit approval.
