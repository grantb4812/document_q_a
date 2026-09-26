import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import db from '../../src/server/db.js'
import { extractDocumentText } from '../../src/server/routes/documents/textExtractor.js'
import { chunkDocumentPages, countTokens } from '../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings } from '../../src/server/routes/documents/embeddingService.js'
import { insertChunk, insertEmbedding } from '../../src/server/routes/documents/chunkHelpers.js'
import { saveMessage } from '../../src/server/routes/chat/messagesHelper.js'

/**
 * Completely wipe all runtime data from SQLite and reset auto-increment counters.
 */
export function clearDatabase() {
  const clearTx = db.transaction(() => {
    db.prepare('DELETE FROM messages').run()
    db.prepare('DELETE FROM embeddings').run()
    db.prepare('DELETE FROM chunks').run()
    db.prepare('DELETE FROM documents').run()

    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('documents', 'chunks', 'messages')").run()
    } catch {
      // sqlite_sequence table may be empty or uninitialized
    }
  })
  clearTx()
}

/**
 * Upsert active application settings to match experiment configurations.
 */
export function updateSettings({ chunkSize, overlap, topK, model } = {}) {
  const current = db.prepare('SELECT * FROM settings ORDER BY id ASC LIMIT 1').get() || {}
  const newChunkSize = chunkSize !== undefined ? Number(chunkSize) : (current.chunk_size || 500)
  const newOverlap = overlap !== undefined ? Number(overlap) : (current.overlap !== undefined ? current.overlap : 50)
  const newTopK = topK !== undefined ? Number(topK) : (current.top_k || 5)
  const newModel = model !== undefined ? model : (current.model || 'gpt-4o-mini')

  db.prepare(`
    INSERT INTO settings (id, model, chunk_size, overlap, top_k, updated_at)
    VALUES (1, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      model = excluded.model,
      chunk_size = excluded.chunk_size,
      overlap = excluded.overlap,
      top_k = excluded.top_k,
      updated_at = excluded.updated_at
  `).run(newModel, newChunkSize, newOverlap, newTopK)

  return { chunkSize: newChunkSize, overlap: newOverlap, topK: newTopK, model: newModel }
}

/**
 * Ingests and processes a strategy corpus into SQLite documents, chunks, and vector tables.
 *
 * @param {object} options
 * @param {string} options.corpusPath - Absolute or relative path to markdown / text corpus
 * @param {string} [options.docName] - Display name in documents list
 * @param {number} [options.chunkSize] - Target tokens per chunk
 * @param {number} [options.overlap] - Overlap tokens
 * @param {Array<string>} [options.vectors] - Optional precomputed embedding vectors
 * @returns {Promise<object>} Ingestion summary
 */
export async function seedCorpusDocument({
  corpusPath,
  docName = 'Enterprise Policy & Operations Manual',
  chunkSize = 500,
  overlap = 50,
  vectors = null,
} = {}) {
  if (!fs.existsSync(corpusPath)) {
    throw new Error(`Corpus file not found: ${corpusPath}`)
  }

  const fileBuffer = fs.readFileSync(corpusPath)
  const fileSize = fileBuffer.length
  const mimetype = corpusPath.endsWith('.md') ? 'text/markdown' : 'text/plain'

  // Step 1: Create document record
  const insertDocStmt = db.prepare(`
    INSERT INTO documents (name, type, size, status, chunk_count, chunk_size, overlap, total_tokens, embedding_cost, blob, created_at)
    VALUES (?, ?, ?, 'processing', 0, ?, ?, 0, 0, ?, datetime('now'))
  `)
  const result = insertDocStmt.run(
    docName,
    mimetype,
    fileSize,
    chunkSize,
    overlap,
    fileBuffer
  )
  const documentId = Number(result.lastInsertRowid)

  // Step 2: Extract text & chunk
  const pages = await extractDocumentText(fileBuffer, mimetype, path.basename(corpusPath))
  const chunks = chunkDocumentPages(pages, {
    targetTokens: chunkSize,
    overlapTokens: overlap,
  })

  const totalTokens = chunks.reduce((sum, item) => sum + (item.tokenCount || 0), 0)
  const embeddingCost = Number((totalTokens * 0.00000002).toFixed(8))

  // Step 3: Insert chunks
  const chunkRecords = []
  const insertChunksTx = db.transaction(() => {
    for (const item of chunks) {
      const chunkId = insertChunk({
        documentId,
        chunkIndex: item.chunkIndex,
        text: item.text,
        start: item.start,
        end: item.end,
        page: item.page,
        tokenCount: item.tokenCount,
      })
      chunkRecords.push({ id: chunkId, text: item.text, page: item.page, tokenCount: item.tokenCount })
    }
  })
  insertChunksTx()

  // Step 4: Embed chunks & insert into vec0 virtual table
  let embeddingVectors = vectors
  if (!embeddingVectors || embeddingVectors.length !== chunkRecords.length) {
    const chunkTexts = chunkRecords.map((c) => c.text)
    embeddingVectors = await generateEmbeddings(chunkTexts)
  }

  const insertEmbeddingsTx = db.transaction(() => {
    for (let i = 0; i < chunkRecords.length; i++) {
      const chunkId = chunkRecords[i].id
      const vector = embeddingVectors[i]
      if (vector) {
        insertEmbedding(chunkId, vector)
      }
    }
  })
  insertEmbeddingsTx()

  // Step 5: Mark document complete
  db.prepare(`
    UPDATE documents
    SET status = 'complete', chunk_count = ?, total_tokens = ?, embedding_cost = ?
    WHERE id = ?
  `).run(chunkRecords.length, totalTokens, embeddingCost, documentId)

  return {
    documentId,
    docName,
    chunkCount: chunkRecords.length,
    chunkSize,
    overlap,
    totalTokens,
    embeddingCost,
    chunks: chunkRecords,
    vectors: embeddingVectors,
  }
}

/**
 * Seed evaluation Q&A pairs directly into the messages table for instant UI inspection.
 *
 * @param {object} options
 * @param {string} [options.conversationId]
 * @param {Array<{ query: string, answer: string, retrievedChunks?: Array, metrics?: object }>} options.qaPairs
 */
export function seedEvaluationMessages({ conversationId = 'default', qaPairs = [] } = {}) {
  const seedTx = db.transaction(() => {
    for (const qa of qaPairs) {
      const userMsgId = `exp-user-${crypto.randomUUID()}`
      const assistantMsgId = `exp-asst-${crypto.randomUUID()}`

      // Save user question
      saveMessage({
        id: userMsgId,
        conversationId,
        role: 'user',
        content: qa.query,
        tokenCount: countTokens(qa.query),
      })

      // Save assistant answer with retrieved chunks and evaluation metrics
      saveMessage({
        id: assistantMsgId,
        conversationId,
        role: 'assistant',
        content: qa.answer || 'No answer generated.',
        retrievedChunks: qa.retrievedChunks || [],
        tokenCount: countTokens(qa.answer || ''),
        metrics: qa.metrics || null,
      })
    }
  })

  seedTx()
}
