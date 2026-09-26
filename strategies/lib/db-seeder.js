import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import db from '../../src/server/db.js'
import { extractDocumentText } from '../../src/server/routes/documents/textExtractor.js'
import { chunkDocumentPages, countTokens } from '../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../src/server/routes/documents/embeddingService.js'
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
 * Executes a real end-to-end Chat QA turn against the SQLite vector database with full
 * telemetry capture (TTFT, prefill latency, generation latency, phase durations, tokens, and cost).
 * Automatically saves both user and assistant messages to SQLite for immediate UI rendering.
 *
 * @param {object} options
 * @param {string} options.query - User question text
 * @param {string} [options.conversationId] - Target conversation ID
 * @param {number} [options.topK] - Retrieval depth
 * @param {string} [options.model] - Model name (e.g., 'gpt-4o-mini')
 * @returns {Promise<object>} Complete turn result with metrics and retrieved chunks
 */
export async function executeEndToEndChatTurn({
  query,
  conversationId = 'default',
  topK = 5,
  model = 'gpt-4o-mini',
}) {
  const serverStartTime = performance.now()
  const trimmedMessage = query.trim()
  const userMsgId = `exp-user-${crypto.randomUUID()}`
  const assistantMsgId = `exp-asst-${crypto.randomUUID()}`

  // Step 1: Count user tokens and save user message
  const userTokens = countTokens(trimmedMessage)
  saveMessage({
    id: userMsgId,
    conversationId,
    role: 'user',
    content: trimmedMessage,
    tokenCount: userTokens,
  })

  // Step 2: Embed user query
  const embedStartTime = performance.now()
  const [queryVector] = await generateEmbeddings([trimmedMessage])
  const embedDurationMs = Math.round(performance.now() - embedStartTime)

  // Step 3: Vector retrieval via sqlite-vec
  let retrievedChunks = []
  let vecDurationMs = 0
  if (queryVector) {
    const vecStartTime = performance.now()
    const floatArray = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector)
    const stmt = db.prepare(`
      SELECT 
        c.id,
        c.document_id AS documentId,
        d.name AS documentName,
        c.chunk_index AS chunkIndex,
        c.text,
        c.start,
        c.end,
        c.page,
        c.token_count AS tokenCount,
        vec_distance_cosine(e.vector, ?) AS distance
      FROM embeddings e
      JOIN chunks c ON c.id = e.chunk_id
      LEFT JOIN documents d ON d.id = c.document_id
      ORDER BY distance ASC
      LIMIT ?
    `)
    const rows = stmt.all(floatArray, topK)
    vecDurationMs = Math.round(performance.now() - vecStartTime)

    retrievedChunks = rows.map((r) => {
      const dist = typeof r.distance === 'number' ? r.distance : 0.5
      const score = Math.max(0, Math.min(1, 1 - dist))
      return {
        id: r.id,
        documentId: r.documentId,
        documentName: r.documentName,
        chunkIndex: r.chunkIndex,
        text: r.text,
        page: r.page,
        tokenCount: r.tokenCount,
        distance: Number(dist.toFixed(4)),
        score: Number(score.toFixed(2)),
      }
    })
  }

  // Step 4: Construct formatted RAG prompt matching production chat route
  const promptPrepStartTime = performance.now()
  let contextText = ''
  if (retrievedChunks.length > 0) {
    contextText = retrievedChunks
      .map((chunk, i) => {
        const docName = chunk.documentName || `Document #${chunk.documentId || i + 1}`
        const chunkNum = chunk.chunkIndex !== undefined ? chunk.chunkIndex + 1 : i + 1
        const pageInfo = chunk.page ? ` | Page: ${chunk.page}` : ''
        return `[Chunk #${chunkNum}] Document: "${docName}"${pageInfo}\nContent:\n"""\n${chunk.text}\n"""`
      })
      .join('\n\n')
  }

  const systemPrompt = `You are a helpful, precise AI assistant for a Document Q&A application.
Your goal is to answer the user's question accurately using ONLY the provided retrieved context sources below.

Guidelines:
1. Base your answers strictly on the context provided. Do not fabricate information.
2. If the answer cannot be determined or found in the provided context or prior conversation, clearly state: "I could not find information about that in the uploaded documents."
3. Cite your sources inline using the chunk identifier (e.g., [Chunk 1], [Chunk 2]) when making factual claims.
4. Format your response cleanly using Markdown (bold text, bullet points, code blocks where appropriate).

Retrieved Context Sources:
${contextText || '(No relevant document context found in the database for this query.)'}`

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: trimmedMessage },
  ]

  const promptInputTokens = apiMessages.reduce(
    (sum, msg) => sum + countTokens(msg.content) + 4,
    0
  )
  const promptPrepDurationMs = Math.round(performance.now() - promptPrepStartTime)

  // Step 5: Call LLM with streaming to capture precise TTFT
  const openai = getOpenAIClient()
  let fullResponse = ''
  let firstTokenTimestamp = null
  const streamStartTime = performance.now()

  if (openai) {
    const stream = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.2,
      max_completion_tokens: 2048,
      stream: true,
    })

    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || ''
      if (content) {
        if (!firstTokenTimestamp) {
          firstTokenTimestamp = performance.now()
        }
        fullResponse += content
      }
    }
  } else {
    // Offline / Demo fallback
    firstTokenTimestamp = performance.now() + 35
    fullResponse = retrievedChunks.length > 0
      ? `Based on the retrieved sources:\n\n${retrievedChunks[0].text.slice(0, 300)}...`
      : 'I could not find information about that in the uploaded documents.'
  }

  const streamEndTime = performance.now()
  const assistantTokens = countTokens(fullResponse)
  const totalTokens = promptInputTokens + assistantTokens

  // Latency metrics (exact ms)
  const serverTtftMs = firstTokenTimestamp
    ? Math.round(firstTokenTimestamp - serverStartTime)
    : Math.round(streamEndTime - serverStartTime)
  const totalServerDurationMs = Math.round(streamEndTime - serverStartTime)
  const prefillDurationMs = firstTokenTimestamp
    ? Math.round(firstTokenTimestamp - streamStartTime)
    : 0
  const generationDurationMs = firstTokenTimestamp
    ? Math.round(streamEndTime - firstTokenTimestamp)
    : Math.round(streamEndTime - streamStartTime)

  // Pricing Model
  const EMBED_COST_PER_TOKEN = 0.00000002
  const PROMPT_COST_PER_TOKEN = 0.00000015
  const COMPLETION_COST_PER_TOKEN = 0.0000006

  const embedCost = userTokens * EMBED_COST_PER_TOKEN
  const promptCost = promptInputTokens * PROMPT_COST_PER_TOKEN
  const completionCost = assistantTokens * COMPLETION_COST_PER_TOKEN
  const totalCost = embedCost + promptCost + completionCost
  const formattedCost = totalCost < 0.00001 ? '<$0.00001' : `$${totalCost.toFixed(5)}`

  const metrics = {
    ttftMs: serverTtftMs,
    totalDurationMs: totalServerDurationMs,
    serverPhases: {
      embeddingMs: embedDurationMs,
      vectorSearchMs: vecDurationMs,
      promptPrepMs: promptPrepDurationMs,
      prefillMs: prefillDurationMs,
      generationMs: generationDurationMs,
    },
    tokens: {
      embedding: userTokens,
      prompt: promptInputTokens,
      completion: assistantTokens,
      total: totalTokens,
    },
    cost: {
      embedding: Number(embedCost.toFixed(8)),
      prompt: Number(promptCost.toFixed(8)),
      completion: Number(completionCost.toFixed(8)),
      total: Number(totalCost.toFixed(8)),
      formatted: formattedCost,
    },
    model: openai ? model : 'demo-mode',
  }

  // Step 6: Save assistant message with full metrics and retrieved chunks
  saveMessage({
    id: assistantMsgId,
    conversationId,
    role: 'assistant',
    content: fullResponse,
    retrievedChunks,
    tokenCount: assistantTokens,
    metrics,
  })

  return {
    userMessageId: userMsgId,
    assistantMessageId: assistantMsgId,
    query: trimmedMessage,
    answer: fullResponse,
    retrievedChunks,
    metrics,
  }
}
