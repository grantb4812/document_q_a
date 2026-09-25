import db from '../../db/connection.js'
import { extractDocumentText } from './textExtractor.js'
import { chunkDocumentPages } from './tokenChunker.js'
import { generateEmbeddings } from './embeddingService.js'
import { insertChunk, insertEmbedding } from './chunkHelpers.js'

let sseConnection = null

export default async function (fastify, opts) {
  // 1. Get documents
  fastify.get('/', async (request, reply) => {
    const documents = db.prepare(
      'SELECT id, name, type, size, status, chunk_count, created_at FROM documents'
    ).all()
    return {
      message: 'Documents retrieved successfully',
      documents,
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

  // 3. Upload document and send processing updates via shared SSE connection
  fastify.post('/upload', async function (request, reply) {
    let filename
    let mimetype
    let buffer

    if (request.isMultipart()) {
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' })
      }
      filename = data.filename
      mimetype = data.mimetype
      buffer = await data.toBuffer()
    } else if (request.body) {
      filename = request.body.name || request.body.filename
      mimetype = request.body.type || request.body.mimetype
      buffer = request.body.blob ? Buffer.from(request.body.blob) : Buffer.from('')
    }

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

    // Step 0: Save document
    sendEvent({ step: 'Saving document', stepIndex: 0, status: 'processing', filename })
    const insertDocStmt = db.prepare(`
      INSERT INTO documents (name, type, size, status, chunk_count, blob, created_at)
      VALUES (?, ?, ?, 'processing', 0, ?, datetime('now'))
    `)
    const result = insertDocStmt.run(
      filename,
      mimetype || 'application/octet-stream',
      size,
      buffer || Buffer.from('')
    )
    const documentId = Number(result.lastInsertRowid)

    // Artificial delay to allow UI to render 'Saving document' stage
    await delay(1000)

    try {
      // Step 1: Extract text
      const pages = await extractDocumentText(buffer, mimetype, filename)

      // Step 2: Chunk document
      sendEvent({ step: 'Chunking document', stepIndex: 1, status: 'processing', id: documentId, filename })
      const chunks = chunkDocumentPages(pages, {
        targetTokens: 500,
        overlapTokens: 50,
      })

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
        SET status = 'complete', chunk_count = ?
        WHERE id = ?
      `).run(chunkRecords.length, documentId)

      sendEvent({
        step: 'Complete',
        stepIndex: 3,
        status: 'complete',
        id: documentId,
        filename,
        chunkCount: chunkRecords.length,
      })

      return reply.send({
        message: 'Document uploaded and processed successfully',
        id: documentId,
        chunkCount: chunkRecords.length,
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
