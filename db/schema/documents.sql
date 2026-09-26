CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  size INTEGER,
  status TEXT DEFAULT 'uploaded',
  chunk_count INTEGER DEFAULT 0,
  chunk_size INTEGER DEFAULT 500,
  overlap INTEGER DEFAULT 50,
  total_tokens INTEGER DEFAULT 0,
  embedding_cost REAL DEFAULT 0.0,
  blob BLOB,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
