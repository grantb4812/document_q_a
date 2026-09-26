import db from '../../db.js'

/**
 * Save a message to the database
 */
export function saveMessage({
  id,
  conversationId = 'default',
  role,
  content,
  retrievedChunks = null,
  tokenCount = 0,
  metrics = null,
}) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, retrieved_chunks, token_count, metrics, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  stmt.run(
    id,
    conversationId,
    role,
    content,
    retrievedChunks ? JSON.stringify(retrievedChunks) : null,
    tokenCount,
    metrics ? JSON.stringify(metrics) : null
  )
}

/**
 * Fetch all messages for a conversation in chronological order
 */
export function getAllMessages(conversationId = 'default') {
  const stmt = db.prepare(`
    SELECT id, conversation_id AS conversationId, role, content, retrieved_chunks AS retrievedChunks, token_count AS tokenCount, metrics, created_at AS createdAt
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `)

  const rows = stmt.all(conversationId)
  return rows.map((row) => ({
    ...row,
    retrievedChunks: row.retrievedChunks ? JSON.parse(row.retrievedChunks) : null,
    metrics: row.metrics ? JSON.parse(row.metrics) : null,
  }))
}

/**
 * Fetch recent messages backwards from newest to oldest within a maximum token budget,
 * then return them in chronological order.
 *
 * @param {string} conversationId
 * @param {number} maxTokens - Maximum token budget for conversation history
 * @param {string} [excludeId] - Optional message ID to exclude (e.g. current user message)
 * @returns {Array<{ role: string, content: string, tokenCount: number }>}
 */
export function getRecentMessagesWithTokenBudget(
  conversationId = 'default',
  maxTokens = 6000,
  excludeId = null
) {
  let query = `
    SELECT id, role, content, token_count AS tokenCount, created_at AS createdAt
    FROM messages
    WHERE conversation_id = ?
  `
  const params = [conversationId]

  if (excludeId) {
    query += ` AND id != ?`
    params.push(excludeId)
  }

  query += ` ORDER BY created_at DESC`

  const rows = db.prepare(query).all(...params)

  const selectedMessages = []
  let totalTokens = 0

  for (const row of rows) {
    const msgTokens = row.tokenCount || 0
    if (totalTokens + msgTokens > maxTokens && selectedMessages.length > 0) {
      // Exceeds token budget, stop taking older messages
      break
    }
    selectedMessages.push(row)
    totalTokens += msgTokens
  }

  // Reverse back to chronological order (oldest -> newest)
  return selectedMessages.reverse()
}

/**
 * Clear all messages in a conversation
 */
export function clearMessages(conversationId = 'default') {
  const stmt = db.prepare('DELETE FROM messages WHERE conversation_id = ?')
  return stmt.run(conversationId)
}
