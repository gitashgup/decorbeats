# Capture Studio

Route: `/admin/capture`. Uses the existing Supabase auth session and database admin allowlist.

## Staff sequence

1. Choose a working room/rack and select the exact existing product, or New product.
2. Photograph the main, front, back/side and detail views. Contents photograph is optional. Each upload saves the original privately and a 1600px square WebP derivative.
3. Optionally attach one full turntable rotation (1080p/30, H.264, 10–20 seconds, max 45 MB). The clip is preserved, not transcoded; preview before publishing.
4. Enter whole-unit counts for every location, separating damaged/incomplete units. Confirm all locations and Decorbeats-controlled fulfilment.
5. Measure complete product and packed unit in cm/g. Confirm unit contents and pricing with Megha.
6. Review, then confirm inventory and publish. Saved drafts can be resumed on another signed-in device. Refresh from phone only when local changes are saved.

## USB

Browser security does not expose an iPhone camera roll through USB. Use macOS Image Capture to import selected photos/video, then the page's file chooser. The phone page is an alternative direct upload path. A QR pairs the same saved draft, never credentials. Originals are not deleted from the phone.

## Data and release

`capture_drafts` stores private product drafts with revision checks, immutable published state, before-values and complete location/measurement metadata. Only one open draft per existing product. Publishing is a single Postgres transaction using existing reconciliation RPCs plus media changes; unchanged baseline is required to prevent overwriting sales or concurrent admin updates. Failed or repeated requests cannot double-apply stock changes. Archived products cannot be captured. New products get SKUs through the existing serialized quick-create function.

Apply `migrations/20260905_capture_studio.sql` before deploying the frontend. The existing warehouse ledger remains disabled. `products.quantity` remains the checkout authority. Original media bucket is private with admin-only read/insert policies; website derivatives use the existing products bucket. Capture code and HEIC conversion are lazy-loaded outside the storefront entry chunk.

ASIN/Seller SKU are references in the draft only. No Amazon inventory writes occur.
