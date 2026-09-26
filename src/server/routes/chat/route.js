import db from '../../db.js'
import { generateEmbeddings, getOpenAIClient } from '../documents/embeddingService.js'
import { countTokens } from '../documents/tokenChunker.js'
import { getAppSettings } from '../settings/settingsHelper.js'
import {
  saveMessage,
  getRecentMessagesWithTokenBudget,
  getAllMessages,
  clearMessages,
} from './messagesHelper.js'

let sseConnection = null

// Budget settings for LLM context window management
const MAX_PROMPT_BUDGET = 12000 // Target max prompt tokens for gpt-4o-mini
const RESERVED_OUTPUT_TOKENS = 2048 // Reserved tokens for assistant generation

export default async function (fastify, opts) {
  // 1. Establish SSE connection for chat and retrieval streaming
  fastify.get('/stream', async (request, reply) => {
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

  // 2. Fetch full conversation history from SQLite
  fastify.get('/history', async (request, reply) => {
    const conversationId = request.query?.conversationId || 'default'
    const messages = getAllMessages(conversationId)
    return {
      messages,
      count: messages.length,
    }
  })

  // 3. Clear conversation history from SQLite
  fastify.delete('/history', async (request, reply) => {
    const conversationId = request.query?.conversationId || 'default'
    clearMessages(conversationId)
    return {
      success: true,
      message: 'Chat history cleared successfully',
    }
  })

  // 4. Process user message: retrieve relevant chunks, assemble token-budgeted history, and stream response
  fastify.post('/message', async function (request, reply) {
    const { message, conversationId = 'default', topK } = request.body || {}

    if (!message || typeof message !== 'string' || !message.trim()) {
      return reply.code(400).send({ error: 'Message text is required' })
    }

    const appSettings = getAppSettings()
    const effectiveTopK =
      topK && !isNaN(Number(topK)) ? Math.max(1, Math.min(25, Number(topK))) : appSettings.topK || 5

    const serverStartTime = performance.now()
    const trimmedMessage = message.trim()
    const userMsgId = `user_${Date.now()}`
    const assistantMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    // Calculate user message tokens and save to database
    const userTokens = countTokens(trimmedMessage)
    saveMessage({
      id: userMsgId,
      conversationId,
      role: 'user',
      content: trimmedMessage,
      tokenCount: userTokens,
    })

    const sendEvent = (data) => {
      if (sseConnection && !sseConnection.raw.destroyed) {
        sseConnection.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }
    }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    // Step 0: Signal start of assistant response
    sendEvent({
      type: 'start',
      messageId: assistantMsgId,
      userMessage: trimmedMessage,
      timestamp: new Date().toISOString(),
    })

    // Step 1: Signal start of retrieval
    sendEvent({
      type: 'retrieval_start',
      messageId: assistantMsgId,
      query: trimmedMessage,
    })

    let embedDurationMs = 0
    let vecDurationMs = 0

    try {
      // Step 2: Retrieve relevant chunks from database using vector embeddings
      let retrievedChunks = []
      try {
        const embedStartTime = performance.now()
        const [queryVector] = await generateEmbeddings([trimmedMessage])
        embedDurationMs = Math.round(performance.now() - embedStartTime)

        if (queryVector) {
          const vecStartTime = performance.now()
          const floatArray =
            queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector)
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
              e.distance
            FROM embeddings e
            JOIN chunks c ON c.id = e.chunk_id
            LEFT JOIN documents d ON d.id = c.document_id
            WHERE e.vector MATCH ? AND k = ?
            ORDER BY e.distance ASC
          `)
          const rows = stmt.all(floatArray, effectiveTopK)
          vecDurationMs = Math.round(performance.now() - vecStartTime)

          retrievedChunks = rows.map((r) => {
            const dist = typeof r.distance === 'number' ? r.distance : 0.5
            const score = Math.max(0, Math.min(1, 1 - dist))
            return {
              ...r,
              score: Number(score.toFixed(2)),
            }
          })
        }
      } catch (dbErr) {
        console.warn('[chat/route] Retrieval search error:', dbErr.message)
      }

      // Step 3: Emit retrieved chunks to client
      sendEvent({
        type: 'retrieval_chunks',
        messageId: assistantMsgId,
        query: trimmedMessage,
        chunks: retrievedChunks,
      })

      // Step 4: Construct formatted RAG prompt with current chunks
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
4. If the user asks a follow-up question referencing prior conversation (e.g. "what about that one", "can you elaborate"), use the prior messages and current context to respond cohesively.
5. Format your response cleanly using Markdown (bold text, bullet points, code blocks where appropriate).

Retrieved Context Sources:
${contextText || '(No relevant document context found in the database for this query.)'}`

      // Step 5: Calculate token budget and fetch sliding window history
      const systemTokens = countTokens(systemPrompt)
      const remainingHistoryBudget = Math.max(
        0,
        MAX_PROMPT_BUDGET - systemTokens - userTokens - RESERVED_OUTPUT_TOKENS
      )

      // Get recent messages fitting within remaining token budget (excluding current user turn)
      const history = getRecentMessagesWithTokenBudget(
        conversationId,
        remainingHistoryBudget,
        userMsgId
      )

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmedMessage },
      ]

      // Count exact prompt input tokens (including 4 token per-message wrapper overhead)
      const promptInputTokens = apiMessages.reduce(
        (sum, msg) => sum + countTokens(msg.content) + 4,
        0
      )
      const promptPrepDurationMs = Math.round(performance.now() - promptPrepStartTime)

      // Step 6: Call OpenAI LLM (gpt-4o-mini) and stream chunks over SSE
      const openai = getOpenAIClient()
      let fullResponse = ''
      let firstTokenTimestamp = null
      const streamStartTime = performance.now()

      if (openai) {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          temperature: 0.2,
          max_completion_tokens: RESERVED_OUTPUT_TOKENS,
          stream: true,
        })

        for await (const part of stream) {
          const content = part.choices[0]?.delta?.content || ''
          if (content) {
            if (!firstTokenTimestamp) {
              firstTokenTimestamp = performance.now()
            }
            fullResponse += content
            sendEvent({
              type: 'chunk',
              messageId: assistantMsgId,
              chunk: content,
            })
          }
        }
      } else {
        // Fallback simulation when OPENAI_API_KEY is not set
        if (retrievedChunks.length > 0) {
          const topDoc = retrievedChunks[0].documentName || 'your documents'
          const snippet = retrievedChunks[0].text.trim()
          fullResponse = `*(OpenAI API Key not configured — running in demo mode)*\n\nBased on **${topDoc}** (match: ${Math.round((retrievedChunks[0].score || 0.85) * 100)}%):\n\n> "${snippet}"\n\nRetrieved ${retrievedChunks.length} relevant chunk${retrievedChunks.length > 1 ? 's' : ''} for "${trimmedMessage}". Set \`OPENAI_API_KEY\` in your environment to enable full gpt-4o-mini generation.`
        } else {
          fullResponse = `*(OpenAI API Key not configured — running in demo mode)*\n\nI searched your documents for "${trimmedMessage}", but no matching chunks were found. Upload documents via the Sources panel to search and ask questions.`
        }

        const tokens = fullResponse.split(/(\s+)/)
        for (const token of tokens) {
          if (!firstTokenTimestamp) {
            firstTokenTimestamp = performance.now()
          }
          sendEvent({
            type: 'chunk',
            messageId: assistantMsgId,
            chunk: token,
          })
          await delay(25)
        }
      }

      const streamEndTime = performance.now()
      const assistantTokens = countTokens(fullResponse)
      const totalTokens = promptInputTokens + assistantTokens

      // Latency Calculations (in ms)
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

      // Cost Calculation Model (Rates: text-embedding-3-small $0.02/1M, gpt-4o-mini input $0.15/1M, output $0.60/1M)
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
        model: openai ? 'gpt-4o-mini' : 'demo-mode',
      }

      // Step 7: Persist assistant message to database with token count, chunks, and metrics
      saveMessage({
        id: assistantMsgId,
        conversationId,
        role: 'assistant',
        content: fullResponse,
        retrievedChunks,
        tokenCount: assistantTokens,
        metrics,
      })

      // Step 8: Signal completion with full metrics
      sendEvent({
        type: 'done',
        messageId: assistantMsgId,
        fullText: fullResponse,
        metrics,
      })

      return reply.send({
        success: true,
        messageId: assistantMsgId,
        response: fullResponse,
        retrievedCount: retrievedChunks.length,
        tokens: {
          user: userTokens,
          assistant: assistantTokens,
          system: systemTokens,
          prompt: promptInputTokens,
          total: totalTokens,
        },
        metrics,
      })
    } catch (error) {
      console.error('[chat/route] Error processing message:', error)
      sendEvent({
        type: 'error',
        messageId: assistantMsgId,
        error: error.message || 'Failed to process message',
      })

      return reply.code(500).send({ error: error.message || 'Failed to process message' })
    }
  })
}
