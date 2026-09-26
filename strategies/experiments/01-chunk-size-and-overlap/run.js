import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../../corpora/policy-operations.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

const CONFIGS = [
  { id: 'EXP-200-0', chunkSize: 200, overlap: 0, label: 'Micro-Chunks (200t, 0 ovlp)' },
  { id: 'EXP-200-50', chunkSize: 200, overlap: 50, label: 'Micro-Chunks with Overlap (200t, 50 ovlp)' },
  { id: 'EXP-500-50', chunkSize: 500, overlap: 50, label: 'Baseline (500t, 50 ovlp)' },
  { id: 'EXP-2000-0', chunkSize: 2000, overlap: 0, label: 'Macro-Chunks (2000t, 0 ovlp)' },
  { id: 'EXP-2000-200', chunkSize: 2000, overlap: 200, label: 'Macro-Chunks with Overlap (2000t, 200 ovlp)' },
]

const QUERIES = [
  {
    id: 'Q1_CAVEAT',
    query: 'Under what specific condition is the SLA uptime guarantee reduced from 99.99% to 99.50%?',
    targetFact: 'beta experimental GPU clusters or non-dedicated public egress tunnels',
  },
  {
    id: 'Q2_NEEDLE',
    query: 'What is the specific regulatory audit compliance code for biometric credential verification?',
    targetFact: 'BIO-SEC-9844-DELTA',
  },
  {
    id: 'Q3_SEAM',
    query: 'What are the refund eligibility criteria and under what exact circumstances is refund eligibility completely voided?',
    targetFact: 'under 15% annual commit AND voided if discount > 25% or dedicated bare-metal hardware accelerators provisioned',
  },
  {
    id: 'Q4_TABLE',
    query: 'What is the dedicated bandwidth and monthly seat rate for the Tier-3 Platinum plan?',
    targetFact: '25.0 Gbps Dedicated and $175 / user / mo',
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

async function runBenchmark() {
  console.log('='.repeat(80))
  console.log('🔬 EXECUTING EXPERIMENT 01: CHUNK SIZE & OVERLAP BOUNDARY BENCHMARK')
  console.log('='.repeat(80))

  const openai = getOpenAIClient()
  const testResults = []

  for (const cfg of CONFIGS) {
    const pages = [{ pageNumber: 1, text: corpusText }]
    const chunks = chunkDocumentPages(pages, {
      targetTokens: cfg.chunkSize,
      overlapTokens: cfg.overlap,
    })

    const totalDocTokens = chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
    const embeddingCost = totalDocTokens * 0.00000002

    const chunkTexts = chunks.map((c) => c.text)
    const chunkVectors = await generateEmbeddings(chunkTexts)

    const queryEvaluations = []

    for (const q of QUERIES) {
      const [queryVector] = await generateEmbeddings([q.query])

      const scoredChunks = chunks.map((chunk, idx) => {
        const sim = cosineSimilarity(queryVector, chunkVectors[idx])
        return {
          ...chunk,
          score: Number(sim.toFixed(4)),
        }
      }).sort((a, b) => b.score - a.score)

      const top1 = scoredChunks[0]
      const top3 = scoredChunks.slice(0, 3)
      const top3Tokens = top3.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
      const promptCostTop3 = top3Tokens * 0.00000015

      const inTop1 = top1.text.toLowerCase().includes(q.targetFact.toLowerCase().split(' ')[0])
      const inTop3 = top3.some((c) => c.text.toLowerCase().includes(q.targetFact.toLowerCase().split(' ')[0]))

      let answer = 'Simulated response'
      if (openai) {
        try {
          const contextText = top3.map((c, i) => `[Source ${i+1}]\n${c.text}`).join('\n\n')
          const prompt = `Answer the question based strictly on the context:\n\n${contextText}\n\nQuestion: ${q.query}`
          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 250,
          })
          answer = res.choices[0]?.message?.content || ''
        } catch (err) {
          answer = `Error: ${err.message}`
        }
      }

      queryEvaluations.push({
        queryId: q.id,
        queryText: q.query,
        top1Score: top1.score,
        top1Snippet: top1.text.slice(0, 80).replace(/\n/g, ' ') + '...',
        top3Tokens,
        promptCostTop3,
        inTop1,
        inTop3,
        answer: answer.replace(/\n/g, ' ').slice(0, 150) + '...',
      })
    }

    testResults.push({
      config: cfg,
      chunkCount: chunks.length,
      totalDocTokens,
      embeddingCost,
      queryEvaluations,
    })
  }

  const resultsDir = path.join(__dirname, 'results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })

  fs.writeFileSync(
    path.join(resultsDir, '01-sliding-window.json'),
    JSON.stringify(testResults, null, 2)
  )
  console.log(`✅ Experiment 01 complete! Results written to: ${path.join(resultsDir, '01-sliding-window.json')}`)
}

runBenchmark().catch(console.error)
