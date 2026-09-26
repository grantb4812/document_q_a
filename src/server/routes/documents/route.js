import db from '../../db.js'
import { extractDocumentText } from './textExtractor.js'
import { chunkDocumentPages } from './tokenChunker.js'
import { generateEmbeddings } from './embeddingService.js'
import { insertChunk, insertEmbedding } from './chunkHelpers.js'
import { getAppSettings } from '../settings/settingsHelper.js'

let sseConnection = null

export default async function (fastify, opts) {
  // 1. Get documents with chunking settings metadata and corpus totals
  fastify.get('/', async (request, reply) => {
    const documents = db.prepare(
      'SELECT id, name, type, size, status, chunk_count, chunk_size, overlap, total_tokens, embedding_cost, created_at FROM documents ORDER BY created_at DESC'
    ).all()

    const totalCorpusChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0)
    const totalCorpusTokens = documents.reduce((sum, d) => sum + (d.total_tokens || 0), 0)
    const totalCorpusCost = documents.reduce((sum, d) => sum + (d.embedding_cost || 0), 0)

    return {
      message: 'Documents retrieved successfully',
      documents,
      stats: {
        totalDocuments: documents.length,
        totalChunks: totalCorpusChunks,
        totalTokens: totalCorpusTokens,
        totalEmbeddingCost: Number(totalCorpusCost.toFixed(8)),
        formattedTotalCost:
          totalCorpusCost < 0.00001 && totalCorpusCost > 0
            ? '<$0.00001'
            : `$${totalCorpusCost.toFixed(5)}`,
      },
    }
  })

  // 2. Establish SSE connection
  fastify.get('/upload', async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('Access-Control-Allow-Origin', '*')
    reply.raw.flushHeaders()

    sseConnection = reply

    request.raw.on('close', () => {
      if (sseConnection === reply) {
        sseConnection = null
      }
    })
  })

  // 3. Upload document and process using specific or default chunkSize and overlap
  fastify.post('/upload', async function (request, reply) {
    let filename
    let mimetype
    let buffer
    let reqChunkSize = null
    let reqOverlap = null

    const appSettings = getAppSettings()

    if (request.isMultipart()) {
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }
      filename = data.filename
      mimetype = data.mimetype
      buffer = await data.toBuffer()

      // Extract optional chunkSize and overlap from form fields or query string
      if (data.fields?.chunkSize?.value) {
        reqChunkSize = Number(data.fields.chunkSize.value)
      }
      if (data.fields?.overlap?.value) {
        reqOverlap = Number(data.fields.overlap.value)
      }
    } else if (request.body) {
      filename = request.body.name || request.body.filename
      mimetype = request.body.type || request.body.mimetype
      buffer = request.body.blob ? Buffer.from(request.body.blob) : Buffer.from('')
      reqChunkSize = request.body.chunkSize ? Number(request.body.chunkSize) : null
      reqOverlap = request.body.overlap ? Number(request.body.overlap) : null
    }

    // Query parameters can also specify chunkSize & overlap
    if (request.query?.chunkSize) {
      reqChunkSize = Number(request.query.chunkSize)
    }
    if (request.query?.overlap) {
      reqOverlap = Number(request.query.overlap)
    }

    const docChunkSize = reqChunkSize && !isNaN(reqChunkSize) ? reqChunkSize : appSettings.chunkSize || 500
    const docOverlap = reqOverlap !== null && !isNaN(reqOverlap) ? reqOverlap : appSettings.overlap || 50

    if (!filename) {
      return reply.code(400).send({ error: 'File is required' })
    }

    const sendEvent = (data) => {
      if (sseConnection && !sseConnection.raw.destroyed) {
        sseConnection.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const size = buffer ? buffer.length : 0

    // Step 0: Save document with chunking settings receipt
    sendEvent({ step: 'Saving document', stepIndex: 0, status: 'processing', filename })
    const insertDocStmt = db.prepare(`
      INSERT INTO documents (name, type, size, status, chunk_count, chunk_size, overlap, total_tokens, embedding_cost, blob, created_at)
      VALUES (?, ?, ?, 'processing', 0, ?, ?, 0, 0, ?, datetime('now'))
    `)
    const result = insertDocStmt.run(
      filename,
      mimetype || 'application/octet-stream',
      size,
      docChunkSize,
      docOverlap,
      buffer || Buffer.from('')
    )
    const documentId = Number(result.lastInsertRowid)

    // Artificial delay to allow UI to render 'Saving document' stage
    await delay(1000)

    try {
      // Step 1: Extract text
      const pages = await extractDocumentText(buffer, mimetype, filename)

      // Step 2: Chunk document using configured chunkSize and overlap
      sendEvent({ step: 'Chunking document', stepIndex: 1, status: 'processing', id: documentId, filename })
      const chunks = chunkDocumentPages(pages, {
        targetTokens: docChunkSize,
        overlapTokens: docOverlap,
      })

      // Calculate total tokens and embedding cost for this document ($0.02 / 1M tokens)
      const totalTokens = chunks.reduce((sum, item) => sum + (item.tokenCount || 0), 0)
      const embeddingCost = Number((totalTokens * 0.00000002).toFixed(8))

      // Persist chunks
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
          chunkRecords.push({ id: chunkId, text: item.text })
        }
      })
      insertChunksTx()

      // Artificial delay to allow UI to render 'Chunking document' stage
      await delay(1000)

      // Step 3: Embed document
      sendEvent({
        step: 'Embedding document',
        stepIndex: 2,
        status: 'processing',
        id: documentId,
        filename,
        chunkCount: chunkRecords.length,
        totalTokens,
        embeddingCost,
      })
      const chunkTexts = chunkRecords.map((c) => c.text)
      const vectors = await generateEmbeddings(chunkTexts)

      // Persist embeddings
      const insertEmbeddingsTx = db.transaction(() => {
        for (let i = 0; i < chunkRecords.length; i++) {
          const chunkId = chunkRecords[i].id
          const vector = vectors[i]
          if (vector) {
            insertEmbedding(chunkId, vector)
          }
        }
      })
      insertEmbeddingsTx()

      // Artificial delay to allow UI to render 'Embedding document' stage
      await delay(1000)

      // Step 4: Complete
      db.prepare(`
        UPDATE documents
        SET status = 'complete', chunk_count = ?, total_tokens = ?, embedding_cost = ?
        WHERE id = ?
      `).run(chunkRecords.length, totalTokens, embeddingCost, documentId)

      sendEvent({
        step: 'Complete',
        stepIndex: 3,
        status: 'complete',
        id: documentId,
        filename,
        chunkCount: chunkRecords.length,
        chunkSize: docChunkSize,
        overlap: docOverlap,
        totalTokens,
        embeddingCost,
      })

      return reply.send({
        message: 'Document uploaded and processed successfully',
        id: documentId,
        chunkCount: chunkRecords.length,
        chunkSize: docChunkSize,
        overlap: docOverlap,
        totalTokens,
        embeddingCost,
      })
    } catch (error) {
      db.prepare(`
        UPDATE documents
        SET status = 'error'
        WHERE id = ?
      `).run(documentId)

      sendEvent({
        step: 'Error',
        stepIndex: 3,
        status: 'error',
        id: documentId,
        filename,
        error: error.message || 'Processing failed',
      })

      return reply.code(500).send({ error: error.message || 'Processing failed' })
    }
  })

  // 4. Delete single document (cascades to chunks & embeddings via schema)
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params
    const docId = Number(id)
    if (isNaN(docId)) {
      return reply.code(400).send({ error: 'Invalid document ID' })
    }

    const result = db.prepare('DELETE FROM documents WHERE id = ?').run(docId)
    if (result.changes === 0) {
      return reply.code(404).send({ error: 'Document not found' })
    }

    return { message: 'Document deleted successfully', id: docId }
  })

  // 5. Delete all documents (cascades to chunks & embeddings via schema)
  fastify.delete('/', async (request, reply) => {
    db.prepare('DELETE FROM documents').run()
    return { message: 'All documents deleted successfully' }
  })
}
