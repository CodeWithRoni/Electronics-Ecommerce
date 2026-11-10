# Move GearGrid from D1 to Supabase PostgreSQL

The GitHub Pages storefront and admin keep using the same Cloudflare Worker URL and API. The Worker selects D1 when `DATABASE_PROVIDER` is unset and selects Supabase when it equals `supabase`. Each request uses one provider. The Supabase credentials live in Worker secrets.

## Prepare and rehearse

1. Create or identify the target Supabase project. Apply `supabase/migrations/20261110000100_geargrid.sql` once through a Supabase migration or its SQL editor. It creates the private `geargrid` schema and a Worker-only RPC. Leave the Supabase Data API enabled with the `public` schema exposed.
2. On a staging Worker, configure `SUPABASE_URL` with the project base URL, `SUPABASE_SECRET_KEY` with a server-only secret key, and `DATABASE_PROVIDER=supabase`. Use the existing Worker application variables as appropriate for staging. Confirm that the public catalog, authorized admin, checkout retry, stock deduction and order tracking work with staging data.
3. Deploy the updated production Worker with its current D1 binding. Keep the provider unset so production continues using D1. Set the production `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as Worker secrets. Store credentials and backups in an access-controlled location.

## Cut over

1. Set the production Worker secret `DATABASE_READ_ONLY=1`. Confirm that checkout and admin writes return maintenance errors. Allow in-flight requests to drain before taking the final D1 export. Leave the catalog, admin reads and tracking available.
2. From the repository's `backend/` directory, export D1 to a private directory outside the repository. The destination files contain customer data.

   ```sh
   umask 077
   npx wrangler@4 d1 export electronics-ecommerce --remote --output=/secure/geargrid-d1.sql
   python3 scripts/d1_to_supabase.py /secure/geargrid-d1.sql /secure/geargrid-import.sql
   ```

3. Apply the generated SQL to the empty target tables. For a small import use the Supabase SQL editor. For a larger import use `psql -v ON_ERROR_STOP=1 -f /secure/geargrid-import.sql` with a securely configured connection. The import preserves IDs, order references, dates and stock. It uses a transaction, checks every table's row count and rejects a populated target.
4. Compare imported table counts to the converter summary. Spot-check stock, prices, a recent order's line items and its status history against the final D1 export.
5. Set the production Worker secret `DATABASE_PROVIDER=supabase`. While the write pause is still active, check the live catalog, admin reads and tracking of an existing order. Clear `DATABASE_READ_ONLY` after those checks and verify checkout using your approved production verification process.

## Recovery

Before Supabase accepts writes, set the production Worker provider back to D1 and clear the write pause after verifying D1. Once Supabase accepts writes, pause writes before any rollback and reconcile the new records and stock changes with D1. Keep the final D1 backup until the migration is verified and the recovery window has passed.
