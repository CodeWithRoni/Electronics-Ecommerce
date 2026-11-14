# GearGrid

Independent Bangladesh electronics retail website with an original visual identity, familiar marketplace navigation and **no Karvio ERP connection**.

## Live
- [Storefront](https://codewithroni.github.io/GearGrid/)
- [Admin panel](https://codewithroni.github.io/GearGrid/admin.html)
- API: https://ohdfalbijnqjcgtlibas.supabase.co/functions/v1/geargrid-api

## Repository structure
```
src/
  App.jsx                Storefront navigation and routes
  admin-main.jsx         Admin panel entry (admin.html)
  components/            Header, footer, product cards, PC build export
  pages/                 Storefront pages, customer account and Admin* console pages
  lib/                   API client, cart/catalog store, auth, PC builder rules
supabase/
  functions/geargrid-api Supabase Edge API (storefront, customer and admin actions)
  migrations/            PostgreSQL schema for the private geargrid schema
android/                 WebView Android app for the storefront
branding/                Logo and icon pack
backend/                 Legacy Cloudflare Worker + D1 API (not used in production)
docs/                    Built site published to GitHub Pages by CI — do not edit by hand
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
At `/admin.html`, sign in with your GearGrid admin username or email and password. Admin accounts are provisioned in [Supabase](supabase/README.md) and can manage products, inventory and orders.

## Features and limitations
Implemented: responsive catalog with category, brand, price and offer filters; search and sorting; wishlist; cart; checkout with cash on delivery or a manual bKash reference; order tracking; customer accounts (Supabase Auth) with order history, address book and saved PCs; PC Builder with socket/RAM compatibility checks and image/print export; and an admin panel for products, inventory, categories/brands (Excel import/export), attributes, orders, banners, footer, shipping, bKash, registration email, invoices and sales reports.

Not yet implemented: reviews, coupons, product comparison, automated payment verification, attribute-based storefront filters and production rate limiting. Admin reports and customer lists cover the latest 200 orders. Do not accept real orders until checkout and stock handling have been tested.

The layout is independently authored; no Star Tech logos, images, or brand identity are used.
