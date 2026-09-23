import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'qa.db')

export const db = new Database(DB_PATH)

// Enable WAL mode and foreign key constraints
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export default db
