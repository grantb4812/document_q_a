CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start INTEGER,
  end INTEGER,
  page INTEGER,
  token_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  vector FLOAT[1536] distance_metric=cosine
);

CREATE TRIGGER IF NOT EXISTS delete_document_chunks
AFTER DELETE ON documents
BEGIN
  DELETE FROM chunks WHERE document_id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS delete_chunk_embeddings
AFTER DELETE ON chunks
BEGIN
  DELETE FROM embeddings WHERE chunk_id = OLD.id;
END;
