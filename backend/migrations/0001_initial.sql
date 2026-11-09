CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT DEFAULT '', description TEXT DEFAULT '',
  price REAL NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  group_id TEXT DEFAULT '', category_id TEXT DEFAULT '', brand_id TEXT DEFAULT '',
  unit TEXT DEFAULT 'pcs', image TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  order_no TEXT PRIMARY KEY, client_ref TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  phone TEXT NOT NULL, address TEXT NOT NULL, area TEXT NOT NULL,
  note TEXT DEFAULT '', payment TEXT NOT NULL, bkash_sender TEXT DEFAULT '',
  bkash_trx TEXT DEFAULT '', payment_status TEXT DEFAULT 'pending',
  delivery REAL NOT NULL, total REAL NOT NULL, status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  order_no TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL,
  unit TEXT NOT NULL, qty INTEGER NOT NULL, price REAL NOT NULL, total REAL NOT NULL,
  FOREIGN KEY(order_no) REFERENCES orders(order_no)
);
CREATE TABLE IF NOT EXISTS order_log (
  order_no TEXT NOT NULL, status TEXT NOT NULL, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_phone ON orders(phone);
