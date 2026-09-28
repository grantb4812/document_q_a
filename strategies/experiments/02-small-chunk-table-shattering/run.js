import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../../corpora/policy-operations.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

// Two chunking regimes: Micro-Chunks (80t) vs Cohesive Table Chunks (500t)
const CONFIGS = [
  {
    id: 'MICRO_80T',
    label: 'Micro-Chunking (80 tokens, 0 overlap)',
    chunkSize: 80,
    overlap: 0,
    topK: 1,
    description: 'Slices structured markdown tables across 3-4 separate chunks, severing column headers from lower tier rows.',
  },
  {
    id: 'COHESIVE_500T',
    label: 'Cohesive Table Chunking (500 tokens, 50 overlap)',
    chunkSize: 500,
    overlap: 50,
    topK: 1,
    description: 'Encompasses the entire 4-tier matrix with column headers and footnotes inside a single unified chunk.',
  },
]

const TEST_QUERIES = [
  {
    id: 'Q1_FULL_TABLE_REQUEST',
    title: 'Full Table Request ("All 4 Service Tiers Comparison")',
    query: 'Please provide the complete comparison table of all 4 service tiers (Tier 1 through Tier 4) with their bandwidth, vCPU/RAM, storage, and monthly seat rates.',
    expectedTiers: ['Tier-1 Bronze', 'Tier-2 Silver', 'Tier-3 Platinum', 'Tier-4 Custom'],
    targetFact: 'All 4 tiers: $45, $85, $175, Custom',
    description: 'Tests if micro-chunking only returns the header + Tier 1, failing to provide Tiers 2, 3, and 4.',
  },
  {
    id: 'Q2_LOWER_ROW_ISOLATION',
    title: 'Lower Row Query ("Tier-3 Platinum Storage & Rate")',
    query: 'What is the storage allocation and monthly seat rate for Tier-3 Platinum?',
    expectedTiers: ['Tier-3 Platinum'],
    targetFact: '50 TB NVMe SSD and $175 / user / mo',
    description: 'Tests whether retrieving an orphaned lower row without table headers causes column confusion or hallucination.',
  },
  {
    id: 'Q3_TIER4_ENTERPRISE',
    title: 'Tail-End Row Query ("Tier-4 Custom Specifications")',
    query: 'What is the dedicated bandwidth and support response SLA for the Tier-4 Custom plan?',
    expectedTiers: ['Tier-4 Custom'],
    targetFact: '100.0 Gbps Redundant and 24/7 Dedicated War Room',
    description: 'Tests if tail-end row is completely severed and dropped from top search results.',
  },
]

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  return normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

async function runTableShatteringExperiment() {
  console.log('='.repeat(90))
  console.log('🔬 EXPERIMENT 02: SMALL CHUNK FRAGMENTATION & TABLE SHATTERING BENCHMARK')
  console.log('='.repeat(90))

  const openai = getOpenAIClient()
  const results = []

  for (const cfg of CONFIGS) {
    console.log(`\n\n${'#'.repeat(90)}`)
    console.log(`⚙️  EVALUATING: ${cfg.label}`)
    console.log(`   Chunk Size: ${cfg.chunkSize} tokens | Top-K: ${cfg.topK}`)
    console.log(`   Hypothesis: ${cfg.description}`)
    console.log(`${'#'.repeat(90)}`)

    const pages = [{ pageNumber: 1, text: corpusText }]
    const chunks = chunkDocumentPages(pages, {
      targetTokens: cfg.chunkSize,
      overlapTokens: cfg.overlap,
    })

    console.log(`   Corpus sliced into: ${chunks.length} total chunks`)

    const chunkTexts = chunks.map((c) => c.text)
    const chunkVectors = await generateEmbeddings(chunkTexts)

    const queryOutputs = []

    for (const q of TEST_QUERIES) {
      console.log(`\n▶ Query: "${q.query}"`)

      const [queryVector] = await generateEmbeddings([q.query])

      const rankedChunks = chunks
        .map((c, idx) => ({
          chunkIndex: c.chunkIndex,
          text: c.text,
          tokenCount: c.tokenCount,
          score: Number(cosineSimilarity(queryVector, chunkVectors[idx]).toFixed(4)),
        }))
        .sort((a, b) => b.score - a.score)

      const retrievedChunks = rankedChunks.slice(0, cfg.topK)
      const topChunk = retrievedChunks[0]
      const retrievedText = retrievedChunks.map((c) => c.text).join('\n\n')

      // Check structural properties of retrieved text
      const hasTableHeader = retrievedText.includes('| Service Tier |') && retrievedText.includes('| ---')
      const presentTiers = q.expectedTiers.filter((t) => retrievedText.includes(t))
      const missingTiers = q.expectedTiers.filter((t) => !retrievedText.includes(t))
      const tableCompleteness = Math.round((presentTiers.length / q.expectedTiers.length) * 100)

      console.log(`  📄 Retrieved Top-1 Chunk (Score: ${topChunk.score}):`)
      console.log(`     Has Table Header Row? ${hasTableHeader ? '✅ YES' : '❌ NO (Header Severed!)'}`)
      console.log(`     Tiers Present in Context: [${presentTiers.join(', ')}] (${tableCompleteness}% complete)`)
      if (missingTiers.length > 0) {
        console.log(`     ⚠️  TIERS MISSING FROM RETRIEVED CHUNK: [${missingTiers.join(', ')}]`)
      }
      console.log(`  ─── Snippet ───`)
      console.log(topChunk.text.split('\n').map((l) => `     | ${l}`).join('\n'))
      console.log(`  ───────────────`)

      // Execute LLM completion with the retrieved chunk
      const systemPrompt = `You are a helpful, precise AI assistant for a Document Q&A application.
Answer the user's question accurately using ONLY the provided retrieved context sources below.
If information is missing, clearly state what is missing.

Retrieved Context Sources:
${retrievedText}`

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: q.query },
      ]

      let assistantAnswer = ''
      if (openai) {
        try {
          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: 0.1,
            max_completion_tokens: 500,
          })
          assistantAnswer = res.choices[0]?.message?.content || ''
        } catch (err) {
          assistantAnswer = `Error: ${err.message}`
        }
      }

      console.log(`  🤖 Assistant Response:`)
      console.log(`     "${assistantAnswer.replace(/\n+/g, ' ').slice(0, 200)}..."`)

      queryOutputs.push({
        queryId: q.id,
        title: q.title,
        query: q.query,
        topScore: topChunk.score,
        hasTableHeader,
        presentTiers,
        missingTiers,
        tableCompleteness,
        retrievedSnippet: topChunk.text,
        assistantAnswer,
      })
    }

    results.push({
      configId: cfg.id,
      label: cfg.label,
      chunkSize: cfg.chunkSize,
      queries: queryOutputs,
    })
  }

  const resultsDir = path.join(__dirname, 'results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  const outputPath = path.join(resultsDir, 'table-shattering-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log(`\n\n✅ Benchmark Complete! Output written to:\n${outputPath}`)
}

runTableShatteringExperiment().catch((err) => {
  console.error('Fatal execution error:', err)
  process.exit(1)
})
