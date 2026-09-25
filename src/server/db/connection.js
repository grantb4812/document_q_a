import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

import * as sqliteVec from 'sqlite-vec'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.resolve(__dirname, '../../../qa.db')

export const db = new Database(DB_PATH)

// Load sqlite-vec vector search extension
sqliteVec.load(db)

// Enable WAL mode, foreign key constraints, and recursive triggers for cascades
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.pragma('recursive_triggers = ON')

export default db
