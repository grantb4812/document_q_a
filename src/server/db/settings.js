import db from './connection.js'

export default function settings() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      model TEXT DEFAULT 'gpt-4o-mini',
      chunk_size INTEGER DEFAULT 500,
      overlap INTEGER DEFAULT 50,
      top_k INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // Migrate columns if table already existed
  const columns = db.prepare('PRAGMA table_info(settings)').all().map((c) => c.name)
  if (!columns.includes('chunk_size')) {
    db.exec('ALTER TABLE settings ADD COLUMN chunk_size INTEGER DEFAULT 500')
  }
  if (!columns.includes('overlap')) {
    db.exec('ALTER TABLE settings ADD COLUMN overlap INTEGER DEFAULT 50')
  }
  if (!columns.includes('top_k')) {
    db.exec('ALTER TABLE settings ADD COLUMN top_k INTEGER DEFAULT 5')
  }

  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get()
  let userId = existingUser?.id

  if (!existingUser) {
    const insertUser = db.prepare(`
      INSERT INTO users (username) VALUES (?)
    `)
    const result = insertUser.run('default_user')
    userId = result.lastInsertRowid
  }

  const existingSettings = db.prepare('SELECT id FROM settings WHERE user_id = ?').get(userId)
  if (!existingSettings) {
    const insertSettings = db.prepare(`
      INSERT INTO settings (user_id, model, chunk_size, overlap, top_k)
      VALUES (?, 'gpt-4o-mini', 500, 50, 5)
    `)
    insertSettings.run(userId)
  }
}

/**
 * Get current application settings
 */
export function getAppSettings() {
  const row = db.prepare(`
    SELECT model, chunk_size AS chunkSize, overlap, top_k AS topK, updated_at AS updatedAt
    FROM settings
    ORDER BY id ASC
    LIMIT 1
  `).get()

  return (
    row || {
      model: 'gpt-4o-mini',
      chunkSize: 500,
      overlap: 50,
      topK: 5,
    }
  )
}

/**
 * Update application settings
 */
export function updateAppSettings(updates = {}) {
  const current = getAppSettings()
  const model = updates.model !== undefined ? updates.model : current.model
  const chunkSize = updates.chunkSize !== undefined ? Number(updates.chunkSize) : current.chunkSize
  const overlap = updates.overlap !== undefined ? Number(updates.overlap) : current.overlap
  const topK = updates.topK !== undefined ? Number(updates.topK) : current.topK

  const stmt = db.prepare(`
    UPDATE settings
    SET model = ?, chunk_size = ?, overlap = ?, top_k = ?, updated_at = datetime('now')
    WHERE id = (SELECT id FROM settings ORDER BY id ASC LIMIT 1)
  `)

  stmt.run(model, chunkSize, overlap, topK)
  return getAppSettings()
}
