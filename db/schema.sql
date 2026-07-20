CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    brand TEXT CHECK (brand IN ('brand_1', 'brand_2', 'brand_3')),
    earning DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
    advance_paid DECIMAL(10, 2) DEFAULT 0,
    advance_paid_at DATETIME,
    reconciled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payout_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('advance', 'final_settlement', 'withdrawal')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected')),
    related_sale_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    settled_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_balances (
    user_id TEXT PRIMARY KEY,
    withdrawable_balance DECIMAL(10, 2) DEFAULT 0,
    last_withdrawal_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
