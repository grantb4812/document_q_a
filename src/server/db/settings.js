import db from './connection.js'

export default function settings() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      model TEXT DEFAULT 'gemini-1.5-pro',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get()
  if (!existingUser) {
    const insertUser = db.prepare(`
      INSERT INTO users (username) VALUES (?)
    `)
    const result = insertUser.run('default_user')
    const userId = result.lastInsertRowid

    const insertSettings = db.prepare(`
      INSERT INTO settings (user_id, model)
      VALUES (?, 'gemini-1.5-pro')
    `)
    insertSettings.run(userId)
  }

}
