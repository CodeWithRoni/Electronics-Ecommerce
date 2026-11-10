# GearGrid on Supabase

GearGrid uses GitHub Pages for the storefront and admin UI, the `geargrid-api`
Supabase Edge Function for requests, and the private `geargrid` PostgreSQL
schema for data. The Cloudflare database is omitted from this setup.

The production API is
`https://ohdfalbijnqjcgtlibas.supabase.co/functions/v1/geargrid-api`.
The function reads its project URL and server database credential from Supabase's
built-in runtime environment.

## Admin sign-in

Create an email/password account in Supabase Dashboard → Authentication → Users.
Then register its Auth user ID and a lowercase username in `geargrid.admin_accounts`
using the SQL Editor. Use a username of 3–32 letters, digits, dots, hyphens or
underscores, beginning with a letter or digit. The same account can sign in with
either its username or its email. Passwords are managed by Supabase Auth.

The API checks the Supabase session and the admin allowlist on every management
request. Removing the allowlist row revokes admin access even for an existing
session. For a clean start, add new products in the Admin Panel after switching.

For development set `VITE_API_URL` in `.env.local` to override the production
endpoint. The default API accepts browser requests from `https://codewithroni.github.io`.
Set `ALLOWED_ORIGIN` on a separate staging project if needed for a local browser.
