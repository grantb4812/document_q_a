import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../../corpora/policy-operations.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

// Baseline chunking configuration: 500 tokens, 50 overlap
const BASELINE_CHUNK_SIZE = 500
const BASELINE_OVERLAP = 50

// Top-K Depths to evaluate
const TOP_K_LEVELS = [1, 5, 20]

const EVAL_QUERIES = [
  {
    id: 'Q1_DIRECT_FACT',
    query: 'What is the mandatory regulatory audit compliance code for biometric credential verification?',
    requiredFacts: ['BIO-SEC-9844-DELTA'],
    type: 'Single-Hop Targeted Fact',
  },
  {
    id: 'Q2_MULTI_PART_SYNTHESIS',
    query: 'What is the dedicated bandwidth and seat price for the Tier-3 Platinum plan, and what is the overage fee per GB for cross-region egress traffic?',
    requiredFacts: ['25.0 Gbps', '$175', '$0.045 per gigabyte'],
    type: 'Multi-Part Cross-Paragraph Synthesis',
  },
  {
    id: 'Q3_QUALIFYING_CAVEAT',
    query: 'Under what specific conditions is the standard monthly uptime guarantee reduced from 99.99% to 99.50%?',
    requiredFacts: ['beta experimental GPU', 'public egress tunnels', 'CPU utilization exceeds 92%'],
    type: 'Context-Dependent Rule with Caveats',
  },
  {
    id: 'Q4_COMPREHENSIVE_DR',
    query: 'What are the guaranteed RPO and RTO milestones, and what happens to customer data on day 31 following contract termination?',
    requiredFacts: ['5 minutes', '30 minutes', 'DoD 5220.22-M'],
    type: 'Comprehensive Multi-Metric Lookup',
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

async function runTopKExperiment() {
  console.log('='.repeat(80))
  console.log('🔬 EXECUTING EXPERIMENT 02: TOP-K RETRIEVAL DEPTH (K=1 vs K=5 vs K=20)')
  console.log('='.repeat(80))

  const pages = [{ pageNumber: 1, text: corpusText }]
  const chunks = chunkDocumentPages(pages, {
    targetTokens: BASELINE_CHUNK_SIZE,
    overlapTokens: BASELINE_OVERLAP,
  })

  console.log(`Ingested Corpus: ${chunks.length} chunks (500t / 50 ovlp)`)

  const chunkTexts = chunks.map((c) => c.text)
  const chunkVectors = await generateEmbeddings(chunkTexts)
  const openai = getOpenAIClient()

  const experimentResults = []

  for (const k of TOP_K_LEVELS) {
    console.log(`\n--- Evaluating Retrieval Depth: Top-${k} Chunks ---`)
    const queryResults = []

    for (const q of EVAL_QUERIES) {
      const [queryVector] = await generateEmbeddings([q.query])

      // Score and sort all chunks
      const scored = chunks.map((chunk, idx) => ({
        ...chunk,
        score: Number(cosineSimilarity(queryVector, chunkVectors[idx]).toFixed(4)),
      })).sort((a, b) => b.score - a.score)

      const retrievedChunks = scored.slice(0, Math.min(k, scored.length))
      const promptTokens = retrievedChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
      const promptCost = promptTokens * 0.00000015 // $0.15 / 1M tokens

      const highestScore = retrievedChunks[0]?.score || 0
      const lowestScore = retrievedChunks[retrievedChunks.length - 1]?.score || 0

      // Combined text from all retrieved chunks
      const combinedText = retrievedChunks.map((c) => c.text).join('\n')

      // Check which required facts are captured
      const capturedFacts = q.requiredFacts.filter((f) =>
        combinedText.toLowerCase().includes(f.toLowerCase())
      )
      const recallPercentage = Math.round((capturedFacts.length / q.requiredFacts.length) * 100)

      let answer = 'Simulated response'
      if (openai) {
        try {
          const contextPrompt = retrievedChunks.map((c, i) => `[Source ${i+1} (Score: ${c.score})]\n${c.text}`).join('\n\n')
          const prompt = `You are a precise Document QA assistant. Answer based strictly on the context:\n\n${contextPrompt}\n\nQuestion: ${q.query}`
          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 300,
          })
          answer = res.choices[0]?.message?.content || ''
        } catch (err) {
          answer = `Error: ${err.message}`
        }
      }

      console.log(`  [${q.id}] Recall: ${recallPercentage}% (${capturedFacts.length}/${q.requiredFacts.length} facts) | Tokens: ${promptTokens} | Score Range: [${highestScore} .. ${lowestScore}]`)

      queryResults.push({
        queryId: q.id,
        queryType: q.type,
        queryText: q.query,
        chunksRetrieved: retrievedChunks.length,
        promptTokens,
        promptCost,
        highestScore,
        lowestScore,
        recallPercentage,
        missingFacts: q.requiredFacts.filter((f) => !combinedText.toLowerCase().includes(f.toLowerCase())),
        answer: answer.replace(/\n/g, ' ').slice(0, 160) + '...',
      })
    }

    const avgRecall = Math.round(
      queryResults.reduce((sum, r) => sum + r.recallPercentage, 0) / queryResults.length
    )
    const avgPromptTokens = Math.round(
      queryResults.reduce((sum, r) => sum + r.promptTokens, 0) / queryResults.length
    )
    const avgCost = Number(
      (queryResults.reduce((sum, r) => sum + r.promptCost, 0) / queryResults.length).toFixed(7)
    )

    experimentResults.push({
      topK: k,
      avgRecall,
      avgPromptTokens,
      avgCost,
      queryResults,
    })
  }

  const resultsDir = path.join(__dirname, 'results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })

  fs.writeFileSync(
    path.join(resultsDir, '01-sliding-window.json'),
    JSON.stringify(experimentResults, null, 2)
  )
  console.log(`\n✅ Experiment 02 complete! Results saved to: ${path.join(resultsDir, '01-sliding-window.json')}`)
}

runTopKExperiment().catch(console.error)
