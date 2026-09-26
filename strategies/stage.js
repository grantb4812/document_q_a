import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearDatabase,
  updateSettings,
  seedCorpusDocument,
  executeEndToEndChatTurn,
} from './lib/db-seeder.js'

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

  // 4. Execute live end-to-end chat queries with streaming & TTFT telemetry
  if (!skipChat) {
    console.log('💬 [4/4] Executing real end-to-end streaming chat queries with TTFT capture...')

    for (let i = 0; i < EVAL_QUERIES.length; i++) {
      const q = EVAL_QUERIES[i]
      const turnResult = await executeEndToEndChatTurn({
        query: q.query,
        conversationId: 'default',
        topK: topKArg,
        model: 'gpt-4o-mini',
      })

      const m = turnResult.metrics
      console.log(`\n  📌 Query ${i + 1}: "${q.query}"`)
      console.log(`     ⚡ TTFT: ${m.ttftMs}ms | Total: ${m.totalDurationMs}ms | Tokens: ${m.tokens.total} (Prompt: ${m.tokens.prompt}, Output: ${m.tokens.completion}) | Cost: ${m.cost.formatted}`)
      console.log(`     🔎 Server Phases: Embed: ${m.serverPhases.embeddingMs}ms | VecSearch: ${m.serverPhases.vectorSearchMs}ms | Prefill: ${m.serverPhases.prefillMs}ms | Gen: ${m.serverPhases.generationMs}ms`)
      console.log(`     📚 Sources Retrieved: ${turnResult.retrievedChunks.length} chunks (Top score: ${turnResult.retrievedChunks[0]?.score || 'N/A'})`)
    }

    console.log(`\n    ✓ Seeded ${EVAL_QUERIES.length} real Q&A evaluation dialogues with complete TTFT & metrics.`)
  } else {
    console.log('⏭️  [4/4] Skipping chat seeding (--no-chat flag).')
  }

  console.log('='.repeat(80))
  console.log('✨ STAGING COMPLETE! Live database is ready.')
  console.log('👀 Open http://localhost:5173 or http://localhost:3000 to inspect the document, chunks, and TTFT badge.')
  console.log('='.repeat(80))
}

main().catch((err) => {
  console.error('❌ Staging error:', err)
  process.exit(1)
})
