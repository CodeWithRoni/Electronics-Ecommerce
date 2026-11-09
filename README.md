# Electronics E-commerce

Independent Bangladesh electronics retail website with an original visual identity, familiar marketplace navigation and **no Karvio ERP connection**.

## Live
- [Storefront](https://codewithroni.github.io/Electronics-Ecommerce/)
- [Admin panel](https://codewithroni.github.io/Electronics-Ecommerce/#/admin)
- API: https://electronics-ecommerce-api.ahroni-usa.workers.dev/

## Repository structure
```
src/
  App.jsx                Navigation and routes
  components/            Shared product components
  pages/                 Home, Products, Product, Wishlist, Cart, Checkout, Track, Admin
  lib/                   API client, cart/catalog store, wishlist
  styles.css             Shared responsive styles
  styles-startech.css    Electronics retail theme
backend/
  src/index.js           Independent Cloudflare Worker API
  migrations/            Cloudflare D1 schema migrations
  wrangler.toml          Worker and D1 binding
.github/workflows/       Pages, Worker, and database deployment
```

## Setup
```sh
npm ci
npm run dev
npm run build
```
Set `VITE_API_URL` in `.env.local` for local development. GitHub Pages deploys on main branch pushes. Worker deployment uses GitHub Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Database migrations are manually approved: see `backend/MIGRATIONS.md`.

## Admin
At `/#/admin`, enter the Cloudflare Worker `ADMIN_TOKEN` secret. The admin interface keeps it in memory, not browser storage. Admin can edit products, prices, stock, image URLs and order status. Never commit the token.

## Features and limitations
Implemented: responsive catalog, category navigation, search, filters, sorting, wishlist, cart, checkout, manual bKash reference, order tracking, inventory and order admin.

Not yet implemented: PC builder, comparisons, user accounts, reviews, coupons, image file uploads, automated payment verification, advanced specification filters, robust stock reservation and production rate limiting. Do not accept real orders until checkout and stock handling have been tested.

The layout is independently authored; no Star Tech logos, images, or brand identity are used.
