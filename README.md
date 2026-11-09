# Electronics E-commerce — Independent Store

This is a standalone electronics e-commerce project. **It does not call, read, or write Karvio or its Google Apps Script backend.**

## Architecture
- React + Vite frontend, hosted independently on GitHub Pages.
- Independent Cloudflare Worker API in `backend/src/index.js`.
- Independent Cloudflare D1 SQLite database in `backend/schema.sql`.
- Catalog, checkout, order tracking, product inventory, and order administration.
- Payments: Cash on Delivery; optional manual bKash reference collection (not an automated payment verification).

## Setup
1. Install Node.js 22 and run `npm ci`.
2. Create a Cloudflare account and install Wrangler: `npm install -g wrangler`, then `wrangler login`.
3. Create a **new, independent** D1 database: `wrangler d1 create electronics-ecommerce`. Copy its database ID into `backend/wrangler.toml`.
4. Initialize the schema: `cd backend && wrangler d1 execute electronics-ecommerce --remote --file=schema.sql`.
5. Create an admin secret: `cd backend && wrangler secret put ADMIN_TOKEN`. Use a long random secret.
6. Set Worker variables in Cloudflare for `SHOP_NAME`, `SHOP_PHONE`, `SHOP_ADDRESS`, `ALLOWED_ORIGIN` (your storefront origin), `DELIVERY_INSIDE`, `DELIVERY_OUTSIDE`; optionally `BKASH_NUMBER`.
7. Deploy: `cd backend && wrangler deploy`.
8. In GitHub repository Settings → Secrets and variables → Actions → Variables, create `VITE_API_URL` with your Worker URL. For local development create `.env.local` containing `VITE_API_URL=https://YOUR-WORKER.workers.dev`.
9. Run `npm run dev` locally. The existing GitHub Pages workflow deploys frontend changes from `main`.

**Important:** Without deploying the independent Worker and setting `VITE_API_URL`, the storefront intentionally shows a configuration error rather than silently connecting to Karvio. No fake orders are recorded.

## Admin API
Send JSON POST to the Worker with header `Authorization: Bearer YOUR_ADMIN_TOKEN`:
- `{"action":"admin.products"}` — list inventory
- `{"action":"admin.product.upsert","payload":{"product":{"id":"router-1","name":"Router","price":1500,"stock":10,"group_id":"Networking"}}}`
- `{"action":"admin.orders"}` — list orders
- `{"action":"admin.order.status","payload":{"order_no":"EE-...","status":"confirmed"}}`

Do not put the admin token in frontend source code, `.env` files committed to Git, or browser local storage. Use a secure private admin client.

## Operations and limitations
- This is a new empty database: **Karvio products/orders are not migrated**.
- The storefront must not accept real orders until the Worker, database, inventory and payment settings have been configured and tested.
- bKash references are recorded for manual checking; no automatic payment confirmation is provided.
- For a production launch, add rate limiting, monitoring, backups, transactional stock reservations, and a dedicated authenticated admin UI.
