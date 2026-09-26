import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../strategies/test_corpus_policy.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

// Test configurations
const CONFIGS = [
  { id: 'EXP-200-0', chunkSize: 200, overlap: 0, label: 'Micro-Chunks (200t, 0 ovlp)' },
  { id: 'EXP-200-50', chunkSize: 200, overlap: 50, label: 'Micro-Chunks with Overlap (200t, 50 ovlp)' },
  { id: 'EXP-500-50', chunkSize: 500, overlap: 50, label: 'Baseline (500t, 50 ovlp)' },
  { id: 'EXP-2000-0', chunkSize: 2000, overlap: 0, label: 'Macro-Chunks (2000t, 0 ovlp)' },
  { id: 'EXP-2000-200', chunkSize: 2000, overlap: 200, label: 'Macro-Chunks with Overlap (2000t, 200 ovlp)' },
]

// Target evaluation queries
const QUERIES = [
  {
    id: 'Q1_CAVEAT',
    query: 'Under what specific condition is the SLA uptime guarantee reduced from 99.99% to 99.50%?',
    targetFact: 'beta experimental GPU clusters or non-dedicated public egress tunnels',
    description: 'Context-dependent qualification & caveat test',
  },
  {
    id: 'Q2_NEEDLE',
    query: 'What is the specific regulatory audit compliance code for biometric credential verification?',
    targetFact: 'BIO-SEC-9844-DELTA',
    description: 'Needle-in-a-haystack lookup & vector dilution test',
  },
  {
    id: 'Q3_SEAM',
    query: 'What are the refund eligibility criteria and under what exact circumstances is refund eligibility completely voided?',
    targetFact: 'under 15% annual commit AND voided if discount > 25% or dedicated bare-metal hardware accelerators provisioned',
    description: 'Multi-paragraph rule with voiding conditions (seam test)',
  },
  {
    id: 'Q4_TABLE',
    query: 'What is the dedicated bandwidth and monthly seat rate for the Tier-3 Platinum plan?',
    targetFact: '25.0 Gbps Dedicated and $175 / user / mo',
    description: 'Multi-row Markdown table parsing test',
  },
]

// Cosine similarity between two float arrays
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
  console.log('🔬 STARTING RAG CHUNKING STRATEGY BENCHMARK: 200 vs 500 vs 2000 TOKENS')
  console.log('='.repeat(80))
  console.log(`Corpus: test_corpus_policy.md (${corpusText.length} chars, ~${countTokens(corpusText)} tokens)`)

  const openai = getOpenAIClient()
  console.log(`OpenAI API Mode: ${openai ? 'Active (Live OpenAI inference)' : 'Simulated (Demo embeddings)'}\n`)

  const testResults = []

  for (const cfg of CONFIGS) {
    console.log(`\n--- Running Configuration: ${cfg.label} (${cfg.id}) ---`)

    const pages = [{ pageNumber: 1, text: corpusText }]
    const chunks = chunkDocumentPages(pages, {
      targetTokens: cfg.chunkSize,
      overlapTokens: cfg.overlap,
    })

    const totalDocTokens = chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
    const embeddingCost = totalDocTokens * 0.00000002

    console.log(`  • Chunks generated: ${chunks.length}`)
    console.log(`  • Total chunk tokens: ${totalDocTokens.toLocaleString()} (Overhead: ${Math.round(((totalDocTokens / countTokens(corpusText)) - 1) * 100)}%)`)
    console.log(`  • Ingestion embedding cost: $${embeddingCost.toFixed(6)}`)

    // Embed all chunks
    const chunkTexts = chunks.map((c) => c.text)
    const chunkVectors = await generateEmbeddings(chunkTexts)

    const queryEvaluations = []

    for (const q of QUERIES) {
      const [queryVector] = await generateEmbeddings([q.query])

      // Score each chunk
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

      // Check if target fact keywords exist in Top-1 and Top-3
      const inTop1 = top1.text.toLowerCase().includes(q.targetFact.toLowerCase().split(' ')[0])
      const inTop3 = top3.some((c) => c.text.toLowerCase().includes(q.targetFact.toLowerCase().split(' ')[0]))

      // Synthesize with OpenAI if available
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

  // Generate Markdown Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 FINAL EMPIRICAL RESULTS SUMMARY')
  console.log('='.repeat(80))

  return testResults
}

runBenchmark().then((results) => {
  fs.writeFileSync(
    path.join(__dirname, '../strategies/experiment_results.json'),
    JSON.stringify(results, null, 2)
  )
  console.log('\n✅ Experiment complete! Results saved to strategies/experiment_results.json')
}).catch(console.error)
