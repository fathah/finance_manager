CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  amount_original REAL NOT NULL,
  currency_original TEXT NOT NULL,
  amount_inr REAL NOT NULL,
  exchange_rate REAL NOT NULL,
  category TEXT,
  description TEXT,
  raw_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
