CREATE TABLE IF NOT EXISTS shift_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL, -- Merujuk ke shift_schedules, BUKAN name/start_time hardcode
    cashier_id INTEGER NOT NULL,
    opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    opening_cash NUMERIC NOT NULL DEFAULT 0,
    closing_cash NUMERIC,
    expected_cash NUMERIC,
    cash_difference NUMERIC,
    status TEXT NOT NULL DEFAULT 'OPEN',
    notes TEXT,
    FOREIGN KEY (schedule_id) REFERENCES shift_schedules(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS pos_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cashier_id INTEGER NOT NULL,
    shift_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    opened_at TEXT NOT NULL,
    closed_at TEXT, 
    FOREIGN KEY (shift_id) REFERENCES shifts (id),
    FOREIGN KEY (station_id) REFERENCES stations (id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_no TEXT NOT NULL UNIQUE,

    cashier_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    shift_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,

    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_total NUMERIC NOT NULL DEFAULT 0,
    tax_total NUMERIC NOT NULL DEFAULT 0,
    grand_total NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    change_amount NUMERIC NOT NULL DEFAULT 0,

    payment_status TEXT NOT NULL DEFAULT 'PAID',
    transaction_status TEXT NOT NULL DEFAULT 'COMPLETED',

    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,

    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES pos_sessions(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_sku TEXT,
    qty NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC NOT NULL,
    notes TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    reference_no TEXT,
    paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL UNIQUE,
    receipt_no TEXT NOT NULL UNIQUE,
    printed_count INTEGER NOT NULL DEFAULT 0,
    last_printed_at TEXT,
    printed_by INTEGER,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (printed_by) REFERENCES users(id)
);

-- Tabel Header Hold Cart (1 sesi kasir hanya boleh punya 1 hold cart)
CREATE TABLE IF NOT EXISTS hold_carts (
    session_id INTEGER PRIMARY KEY,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES pos_sessions(id)
);

-- Tabel Rincian Item Hold
CREATE TABLE IF NOT EXISTS hold_cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    qty NUMERIC NOT NULL,
    FOREIGN KEY (session_id) REFERENCES hold_carts(session_id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO shift_schedules (name, start_time, end_time) VALUES 
('Pagi', '08:00', '16:00'),
('Siang', '16:00', '00:00'),
('Malam', '00:00', '08:00');

INSERT OR IGNORE INTO stations (name, status) VALUES 
('Kasir 1', 'Active'),
('Kasir 2', 'Active'),
('Kasir 3 (Backup)', 'Inactive');