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

  const existingDoc = db.prepare('SELECT id FROM documents WHERE name = ?').get('testDoc')
  if (!existingDoc) {
    const testContent = Buffer.from('test content')
    const insertDoc = db.prepare(`
      INSERT INTO documents (name, type, size, status, chunk_count, blob)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertDoc.run('testDoc', 'text/plain', testContent.length, 'complete', 1, testContent)
  }
}
