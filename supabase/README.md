# GearGrid on Supabase

GearGrid uses GitHub Pages for the storefront and admin UI, the `geargrid-api`
Supabase Edge Function for requests, and the private `geargrid` PostgreSQL
schema for data. The Cloudflare database is omitted from this setup.

The production API is
`https://ohdfalbijnqjcgtlibas.supabase.co/functions/v1/geargrid-api`.
The function reads its project URL and server database credential from Supabase's
built-in runtime environment.

Before switching the frontend to this endpoint, set `ADMIN_TOKEN` in the target
project's Edge Function Secrets. Use a long random token and store it in your
password manager. Use the same token to unlock GearGrid's Admin Panel. Checkout
stays unavailable while this secret is missing. For a clean start, add new
products through the Admin Panel after switching.

For development set `VITE_API_URL` in `.env.local` to override the production
endpoint. The default API accepts browser requests from `https://codewithroni.github.io`.
Set `ALLOWED_ORIGIN` on a separate staging project if needed for a local browser.
