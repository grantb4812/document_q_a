CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE DEFAULT 1,
  model TEXT DEFAULT 'gpt-4o-mini',
  chunk_size INTEGER DEFAULT 500,
  overlap INTEGER DEFAULT 50,
  top_k INTEGER DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO settings (id, user_id, model, chunk_size, overlap, top_k)
VALUES (1, 1, 'gpt-4o-mini', 500, 50, 5);
