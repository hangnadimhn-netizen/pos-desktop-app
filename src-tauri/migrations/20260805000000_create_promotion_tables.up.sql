-- 1. Tabel Master Promo
CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    promo_type TEXT NOT NULL, -- 'PERCENTAGE', 'FLAT', 'BOGO', 'THRESHOLD'
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Nilai Diskon
    discount_value NUMERIC NOT NULL DEFAULT 0,
    
    -- Syarat Promo
    min_qty NUMERIC NOT NULL DEFAULT 0,
    reward_qty NUMERIC NOT NULL DEFAULT 0,
    min_purchase NUMERIC NOT NULL DEFAULT 0,
    
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mapping Promo ke Item Tertentu
CREATE TABLE IF NOT EXISTS promotion_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promo_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    FOREIGN KEY (promo_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- 3. Jejak Audit: Diskon per Item (Merujuk ke transaction_items)
CREATE TABLE IF NOT EXISTS transaction_item_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_item_id INTEGER NOT NULL,
    promo_id INTEGER NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id) ON DELETE CASCADE,
    FOREIGN KEY (promo_id) REFERENCES promotions(id) ON DELETE CASCADE
);

-- 4. Jejak Audit: Diskon level Transaksi (Threshold, Merujuk ke transactions)
CREATE TABLE IF NOT EXISTS transaction_discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    promo_id INTEGER NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (promo_id) REFERENCES promotions(id) ON DELETE CASCADE
);

