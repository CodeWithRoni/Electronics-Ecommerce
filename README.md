# GearGrid

Independent Bangladesh electronics retail website with an original visual identity, familiar marketplace navigation and **no Karvio ERP connection**.

## Live
- [Storefront](https://codewithroni.github.io/GearGrid/)
- [Admin panel](https://codewithroni.github.io/GearGrid/admin.html)
- API: https://ohdfalbijnqjcgtlibas.supabase.co/functions/v1/geargrid-api

## Repository structure
```
src/
  App.jsx                Navigation and routes
  components/            Shared product components
  pages/                 Home, Products, Product, Wishlist, Cart, Checkout, Track, Admin
  lib/                   API client, cart/catalog store, wishlist
  styles.css             Shared responsive styles
  styles-startech.css    Electronics retail theme
supabase/
  functions/             Supabase Edge API
  migrations/            PostgreSQL schema
.github/workflows/       GitHub Pages and Android builds
```

## Setup
```sh
npm ci
npm run dev
npm run build
```
Set `VITE_API_URL` in `.env.local` to override the default API for development. GitHub Pages builds on main branch pushes. See [Supabase setup](supabase/README.md) for the API and database.

## Admin
At `/admin.html`, enter the `ADMIN_TOKEN` configured in Supabase Edge Function Secrets. The admin interface keeps it in memory, not browser storage. Admin can edit products, prices, stock, image URLs and order status. Never commit the token.

## Features and limitations
Implemented: responsive catalog, category navigation, search, filters, sorting, wishlist, cart, checkout, manual bKash reference, order tracking, inventory and order admin.

Not yet implemented: PC builder, comparisons, user accounts, reviews, coupons, image file uploads, automated payment verification, advanced specification filters, robust stock reservation and production rate limiting. Do not accept real orders until checkout and stock handling have been tested.

The layout is independently authored; no Star Tech logos, images, or brand identity are used.
