# Karvio Shop

The online shop website for a shop that runs **Karvio** (POS & shop management).
Products, prices, stock and pictures come straight from Karvio; orders go back into Karvio's
**Online Orders** page.

Live: https://codewithroni.github.io/karvio-shop/

## How it works

- **Backend:** the same Google Apps Script web app as Karvio (`src/config.js` → `API_URL`).
  The website uses only the public routes `shop.catalog`, `shop.order.create` and `shop.order.track`;
  it never sees cost prices or stock counts.
- **Google Drive:** Karvio → Settings → Online shop → *Set up Google Drive folder* creates
  `Karvio Shop` › `Images` (product pictures) and `Karvio Shop Database` (orders).
- **Products on the website:** in Karvio, edit a product, tick *Show on the online shop* and add pictures.
- **Payment:** cash on delivery and bKash (the customer sends money and types the TrxID; the shop checks it).
- **Orders:** Karvio → Online Orders → *Open in POS* → complete the sale. The sale confirms the order
  and moves stock; then *Mark shipped* / *Mark delivered*. Customers follow it on *Track your order*.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

Tests run the site against Karvio's in-memory test backend (a checkout of CodeWithRoni/karvio):

```bash
KARVIO_REPO=../karvio npx playwright test
```

## Publish

Every push to `main` builds the site and publishes it to the `gh-pages` branch
(`.github/workflows/deploy.yml`). GitHub Pages serves that branch:
Settings → Pages → *Deploy from a branch* → `gh-pages` / `(root)`.

React 18 · Vite · React Router · Zustand
