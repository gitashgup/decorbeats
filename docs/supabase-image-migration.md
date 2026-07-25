# Supabase image migration

The storefront now uses Supabase Image Transformations to request appropriately
sized images. This reduces transfer size without changing the source catalogue.

## Safe migration

1. Export a database backup from Supabase.
2. Keep the existing Vercel Blob files during the migration.
3. Set `SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` locally. The service-role key must never be added
   to a `VITE_` variable or committed.
4. Preview the affected products:

   `npm run migrate:images:supabase:dry-run`

5. Test a small batch:

   `npm run migrate:images:supabase -- --limit=5`

6. Check those products on desktop and mobile, then run the full migration:

   `npm run migrate:images:supabase`

Each product row is updated only after all of its Vercel-hosted images upload
successfully. The script is resumable and leaves the original Vercel Blob files
untouched. Delete the old files only after the live catalogue has been verified
and a rollback window has passed.

The Supabase `products` bucket should remain public and use a one-year
`cache-control` value for immutable product images.
