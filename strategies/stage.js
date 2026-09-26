import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clearDatabase, updateSettings, seedCorpusDocument, seedEvaluationMessages } from './lib/db-seeder.js'
import { getOpenAIClient, generateEmbeddings } from '../src/server/routes/documents/embeddingService.js'
import db from '../src/server/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultCorpusPath = path.join(__dirname, 'corpora/policy-operations.md')

// Evaluation queries used across experiments
const EVAL_QUERIES = [
  {
    id: 'Q1_DIRECT_FACT',
    query: 'What is the mandatory regulatory audit compliance code for biometric credential verification?',
    targetFact: 'BIO-SEC-9844-DELTA',
  },
  {
    id: 'Q2_MULTI_PART_SYNTHESIS',
    query: 'What is the dedicated bandwidth and seat price for the Tier-3 Platinum plan, and what is the overage fee per GB for cross-region egress traffic?',
    targetFact: '25.0 Gbps Dedicated, $175 / user / mo, $0.045 per gigabyte',
  },
  {
    id: 'Q3_QUALIFYING_CAVEAT',
    query: 'Under what specific conditions is the standard monthly uptime guarantee reduced from 99.99% to 99.50%?',
    targetFact: 'beta experimental GPU clusters or non-dedicated public egress tunnels, or CPU exceeds 92%',
  },
  {
    id: 'Q4_COMPREHENSIVE_DR',
    query: 'What are the guaranteed RPO and RTO milestones, and what happens to customer data on day 31 following contract termination?',
    targetFact: '5 minutes RPO, 30 minutes RTO, purged using DoD 5220.22-M on day 31',
  },
]

async function queryTopKChunks(queryVector, topK = 5) {
  const queryBlob = new Float32Array(queryVector)
  const stmt = db.prepare(`
    SELECT
      c.id,
      c.document_id AS documentId,
      c.chunk_index AS chunkIndex,
      c.text,
      c.page,
      c.token_count AS tokenCount,
      vec_distance_cosine(e.vector, ?) AS distance
    FROM embeddings e
    JOIN chunks c ON c.id = e.chunk_id
    ORDER BY distance ASC
    LIMIT ?
  `)
  const rows = stmt.all(queryBlob, topK)
  return rows.map((r) => ({
    id: r.id,
    chunkIndex: r.chunkIndex,
    text: r.text,
    page: r.page,
    tokenCount: r.tokenCount,
    similarity: Number((1 - r.distance).toFixed(4)),
    distance: Number(r.distance.toFixed(4)),
  }))
}

async function generateAnswerWithContext(query, retrievedChunks) {
  const openai = getOpenAIClient()
  const contextBlock = retrievedChunks
    .map((c, i) => `[Source ${i + 1} - Page ${c.page || 1}]:\n${c.text}`)
    .join('\n\n---\n\n')

  if (!openai) {
    // Fallback response with retrieved evidence summary for offline / API-keyless testing
    return {
      answer: `Based on the retrieved policy document chunks (top ${retrievedChunks.length} sources):\n\n${retrievedChunks[0]?.text?.slice(0, 300)}...`,
      latencyMs: 15,
      promptTokens: 250,
      completionTokens: 80,
    }
  }

  const systemPrompt = `You are a precise corporate policy assistant. Answer the user question strictly using the provided context chunks. If the answer is not supported by context, state clearly that the policy does not specify it.`
  const userPrompt = `Context:\n${contextBlock}\n\nQuestion: ${query}\n\nPlease provide a clear, accurate, and concise answer.`

  const startMs = Date.now()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 400,
  })
  const latencyMs = Date.now() - startMs
  const answer = response.choices[0]?.message?.content || ''

  return {
    answer,
    latencyMs,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const expArg = args.find((a) => a.startsWith('--exp='))?.split('=')[1] || args[0] || '01'
  const chunkSizeArg = Number(args.find((a) => a.startsWith('--chunkSize='))?.split('=')[1] || 500)
  const overlapArg = Number(args.find((a) => a.startsWith('--overlap='))?.split('=')[1] || 50)
  const topKArg = Number(args.find((a) => a.startsWith('--topk='))?.split('=')[1] || 5)
  const skipChat = args.includes('--no-chat')

  console.log('='.repeat(80))
  console.log('🚀 STRATEGY STAGER: LIVE DATABASE RESET & EXPERIMENT INGESTION')
  console.log('='.repeat(80))
  console.log(`Target Experiment : ${expArg}`)
  console.log(`Chunk Size        : ${chunkSizeArg} tokens`)
  console.log(`Overlap           : ${overlapArg} tokens`)
  console.log(`Top-K Retrieval   : ${topKArg}`)
  console.log(`Corpus File       : ${path.relative(process.cwd(), defaultCorpusPath)}`)
  console.log('-'.repeat(80))

  // 1. Wipe database cleanly
  console.log('🧹 [1/4] Clearing active database (documents, chunks, embeddings, messages)...')
  clearDatabase()

  // 2. Update active application settings
  console.log('⚙️  [2/4] Updating settings in SQLite...')
  updateSettings({
    chunkSize: chunkSizeArg,
    overlap: overlapArg,
    topK: topKArg,
    model: 'gpt-4o-mini',
  })

  // 3. Ingest and embed corpus document
  console.log('📄 [3/4] Ingesting document & generating vector embeddings...')
  const docName = `[EXP-${expArg}] Enterprise Policy Manual (${chunkSizeArg}t / ${overlapArg}ovlp)`
  const ingestion = await seedCorpusDocument({
    corpusPath: defaultCorpusPath,
    docName,
    chunkSize: chunkSizeArg,
    overlap: overlapArg,
  })

  console.log(`    ✓ Document ID    : ${ingestion.documentId}`)
  console.log(`    ✓ Chunks Created : ${ingestion.chunkCount}`)
  console.log(`    ✓ Total Tokens   : ${ingestion.totalTokens}`)
  console.log(`    ✓ Embedding Cost : $${ingestion.embeddingCost.toFixed(6)}`)

  // 4. Seed evaluation messages
  if (!skipChat) {
    console.log('💬 [4/4] Executing benchmark queries and seeding chat history...')
    const queryEmbeddings = await generateEmbeddings(EVAL_QUERIES.map((q) => q.query))
    const qaPairs = []

    for (let i = 0; i < EVAL_QUERIES.length; i++) {
      const q = EVAL_QUERIES[i]
      const qVec = queryEmbeddings[i]
      const retrieved = await queryTopKChunks(qVec, topKArg)
      const genResult = await generateAnswerWithContext(q.query, retrieved)

      console.log(`    ✓ Evaluated: "${q.query.slice(0, 55)}..." (Latency: ${genResult.latencyMs}ms)`)

      qaPairs.push({
        query: q.query,
        answer: genResult.answer,
        retrievedChunks: retrieved,
        metrics: {
          experimentId: expArg,
          latencyMs: genResult.latencyMs,
          promptTokens: genResult.promptTokens,
          completionTokens: genResult.completionTokens,
          topK: topKArg,
          topSimilarity: retrieved[0]?.similarity || 0,
        },
      })
    }

    seedEvaluationMessages({ conversationId: 'default', qaPairs })
    console.log(`    ✓ Seeded ${qaPairs.length} Q&A evaluation dialogues into chat history.`)
  } else {
    console.log('⏭️  [4/4] Skipping chat seeding (--no-chat flag).')
  }

  console.log('='.repeat(80))
  console.log('✨ STAGING COMPLETE! Live database is ready.')
  console.log('👀 Open http://localhost:5173 or http://localhost:3000 to inspect the document, chunks, and chat.')
  console.log('='.repeat(80))
}

main().catch((err) => {
  console.error('❌ Staging error:', err)
  process.exit(1)
})
