# Cloudflare D1 migrations

The source of truth for schema changes is `backend/migrations/`. The initial schema is `0001_initial.sql`. `schema.sql` is retained as a reference; do not apply it separately after migrations.

1. In GitHub Actions run **Cloudflare D1 database migrations**, enter `APPLY`, and approve the production environment if configured.
2. This uses `wrangler d1 migrations apply electronics-ecommerce --remote`. Wrangler records applied migrations, so subsequent runs apply only new files.
3. For future changes add `0002_description.sql`, `0003_description.sql`, etc. Never edit an already-applied migration.
4. Back up production data before applying structural changes. A successful migration is not automatically reversible.
5. After migrations, run **Deploy independent Cloudflare Worker API** manually.
6. Configure Worker secrets/variables (especially `ADMIN_TOKEN` and `ALLOWED_ORIGIN`) separately, and set the GitHub Actions variable `VITE_API_URL` to the deployed Worker URL before enabling real checkout.

GitHub Actions repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Do not commit tokens.

These workflows are manual on purpose: a frontend push must not silently mutate the production database.
