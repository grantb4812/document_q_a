import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import * as sqliteVec from 'sqlite-vec'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Connect to root ./db/qa.db (or process.env.DB_PATH for Docker volume persistence)
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../db/qa.db')

export const db = new Database(DB_PATH)

// Load sqlite-vec vector search extension
sqliteVec.load(db)

// Configure SQLite runtime pragmas
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('recursive_triggers = ON')

// Automatically execute all declarative SQL schemas from ./db/schema/*.sql
const schemaDir = path.resolve(__dirname, '../../db/schema')
if (fs.existsSync(schemaDir)) {
  const schemaFiles = ['users.sql', 'settings.sql', 'documents.sql', 'chunks.sql', 'messages.sql']
  for (const file of schemaFiles) {
    const filePath = path.join(schemaDir, file)
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8')
      db.exec(sql)
    }
  }
}

export default db
