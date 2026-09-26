import db from '../../db.js'

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
