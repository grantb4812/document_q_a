import db from './connection.js'

export const EMBEDDING_DIMENSION = 1536 // Default dimension for OpenAI text-embedding-3-small and text-embedding-ada-002

export default function chunks() {
  // 1. Chunks metadata & content table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      text TEXT NOT NULL,
      start INTEGER,
      end INTEGER,
      page INTEGER,
      token_count INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc_page ON chunks(document_id, page);
  `)

  // 2. Embeddings virtual table using sqlite-vec vec0
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
      chunk_id INTEGER PRIMARY KEY,
      vector float[${EMBEDDING_DIMENSION}] distance_metric=cosine
    );
  `)

  // 3. Trigger to automatically delete embeddings when parent chunk is deleted
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_delete_chunk_embeddings
    AFTER DELETE ON chunks
    BEGIN
      DELETE FROM embeddings WHERE chunk_id = old.id;
    END;
  `)
}
