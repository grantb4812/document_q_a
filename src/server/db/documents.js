import db from './connection.js'

export default function documents() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      size INTEGER,
      status TEXT DEFAULT 'uploaded',
      chunk_count INTEGER DEFAULT 0,
      blob BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Ensure columns exist if table was already created
  const columns = db.prepare('PRAGMA table_info(documents)').all().map((c) => c.name)
  if (!columns.includes('size')) {
    db.exec('ALTER TABLE documents ADD COLUMN size INTEGER')
  }
  if (!columns.includes('status')) {
    db.exec("ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'uploaded'")
  }
  if (!columns.includes('chunk_count')) {
    db.exec('ALTER TABLE documents ADD COLUMN chunk_count INTEGER DEFAULT 0')
  }
  if (!columns.includes('created_at')) {
    db.exec('ALTER TABLE documents ADD COLUMN created_at DATETIME')
  }
  if (!columns.includes('chunk_size')) {
    db.exec('ALTER TABLE documents ADD COLUMN chunk_size INTEGER DEFAULT 500')
  }
  if (!columns.includes('overlap')) {
    db.exec('ALTER TABLE documents ADD COLUMN overlap INTEGER DEFAULT 50')
  }
  if (!columns.includes('total_tokens')) {
    db.exec('ALTER TABLE documents ADD COLUMN total_tokens INTEGER DEFAULT 0')
  }
  if (!columns.includes('embedding_cost')) {
    db.exec('ALTER TABLE documents ADD COLUMN embedding_cost REAL DEFAULT 0.0')
  }

  // Backfill total_tokens and embedding_cost for existing documents
  try {
    db.exec(`
      UPDATE documents 
      SET 
        total_tokens = COALESCE((SELECT SUM(token_count) FROM chunks WHERE chunks.document_id = documents.id), 0),
        embedding_cost = COALESCE((SELECT SUM(token_count) FROM chunks WHERE chunks.document_id = documents.id), 0) * 0.00000002
      WHERE (total_tokens = 0 OR total_tokens IS NULL) AND chunk_count > 0;
    `)
  } catch (backfillErr) {
    console.warn('[documents/db] Backfill migration warning:', backfillErr.message)
  }

  const existingDoc = db.prepare('SELECT id FROM documents WHERE name = ?').get('testDoc')
  if (!existingDoc) {
    const testContent = Buffer.from('test content')
    const insertDoc = db.prepare(`
      INSERT INTO documents (name, type, size, status, chunk_count, total_tokens, embedding_cost, blob)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insertDoc.run('testDoc', 'text/plain', testContent.length, 'complete', 1, 3, 0.00000006, testContent)
  }
}
