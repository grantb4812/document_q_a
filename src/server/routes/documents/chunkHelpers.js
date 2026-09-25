import db from '../../db/connection.js'

export const EMBEDDING_DIMENSION = 1536 // Default dimension for OpenAI text-embedding-3-small and text-embedding-ada-002

/**
 * Insert a single chunk into the chunks table
 */
export function insertChunk({ documentId, chunkIndex = 0, text, start = null, end = null, page = null, tokenCount = null }) {
  const stmt = db.prepare(`
    INSERT INTO chunks (document_id, chunk_index, text, start, end, page, token_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(documentId, chunkIndex, text, start, end, page, tokenCount)
  return Number(result.lastInsertRowid)
}

/**
 * Insert vector embedding for a chunk into the vec0 virtual table
 * Note: vec0 requires BigInt for primary key binding in better-sqlite3
 */
export function insertEmbedding(chunkId, vector) {
  const stmt = db.prepare(`
    INSERT INTO embeddings (chunk_id, vector)
    VALUES (?, ?)
  `)
  const floatArray = vector instanceof Float32Array ? vector : new Float32Array(vector)
  stmt.run(BigInt(chunkId), floatArray)
}

/**
 * Search for most similar chunks using cosine distance
 */
export function searchSimilarChunks(queryVector, limit = 5) {
  const floatArray = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector)
  const stmt = db.prepare(`
    SELECT 
      c.id,
      c.document_id,
      c.chunk_index,
      c.text,
      c.start,
      c.end,
      c.page,
      c.token_count,
      e.distance
    FROM embeddings e
    JOIN chunks c ON c.id = e.chunk_id
    WHERE e.vector MATCH ? AND k = ?
    ORDER BY e.distance ASC
  `)
  return stmt.all(floatArray, limit)
}

/**
 * Retrieve all chunks for a document ordered by chunk_index
 */
export function getChunksByDocumentId(documentId) {
  const stmt = db.prepare(`
    SELECT id, document_id, chunk_index, text, start, end, page, token_count, created_at
    FROM chunks
    WHERE document_id = ?
    ORDER BY chunk_index ASC
  `)
  return stmt.all(documentId)
}
