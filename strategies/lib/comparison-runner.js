import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../corpora/policy-operations.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

export const CHUNK_CONFIGS = [
  { id: '100t-50ov', chunkSize: 100, overlap: 50, label: '100t / 50 ovlp (Micro-Chunks)', badge: 'Micro' },
  { id: '200t-50ov', chunkSize: 200, overlap: 50, label: '200t / 50 ovlp (Compact)', badge: 'Compact' },
  { id: '500t-50ov', chunkSize: 500, overlap: 50, label: '500t / 50 ovlp (Baseline)', badge: 'Baseline' },
  { id: '2000t-200ov', chunkSize: 2000, overlap: 200, label: '2000t / 200 ovlp (Macro-Chunks)', badge: 'Macro' },
]

export const TOP_K_CONFIGS = [
  { id: 'k1', topK: 1, label: 'Top-1 Retrieval (K=1)', badge: 'Minimal' },
  { id: 'k3', topK: 3, label: 'Top-3 Retrieval (K=3)', badge: 'Compact' },
  { id: 'k5', topK: 5, label: 'Top-5 Retrieval (K=5)', badge: 'Baseline' },
  { id: 'k20', topK: 20, label: 'Top-20 Retrieval (K=20)', badge: 'Exhaustive' },
]

export const COMPARISON_QUERIES = [
  {
    id: 'Q1_BIOMETRIC_NEEDLE',
    title: 'Biometric Audit Code',
    query: 'What is the mandatory regulatory audit compliance code for biometric credential verification?',
    targetFacts: ['BIO-SEC-9844-DELTA'],
    description: 'Targeted single-hop fact lookup hidden in Section 3.',
  },
  {
    id: 'Q2_BANDWIDTH_OVERAGE',
    title: 'Tier-3 Platinum & Overage Rate',
    query: 'What is the dedicated bandwidth and seat price for the Tier-3 Platinum plan, and what is the overage fee per GB for cross-region egress traffic?',
    targetFacts: ['25.0 Gbps', '$175', '$0.045 per gigabyte'],
    description: 'Multi-part synthesis across table rows and paragraph notes.',
  },
  {
    id: 'Q3_SLA_CAVEATS',
    title: 'SLA 99.50% Downgrade Rules',
    query: 'Under what specific conditions is the standard monthly uptime guarantee reduced from 99.99% to 99.50%?',
    targetFacts: ['beta experimental GPU', 'public egress tunnels', 'CPU utilization exceeds 92%'],
    description: 'Policy exceptions with multiple qualifying conditions.',
  },
  {
    id: 'Q4_DR_DATA_PURGE',
    title: 'Disaster Recovery & Data Purge',
    query: 'What are the guaranteed RPO and RTO milestones, and what happens to customer data on day 31 following contract termination?',
    targetFacts: ['5 minutes', '30 minutes', 'DoD 5220.22-M'],
    description: 'Cross-paragraph recovery metrics and cryptographic purge protocol.',
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

/**
 * Run Experiment 01: Chunk Size & Overlap Boundary Benchmark
 */
export async function runChunkSizeComparison({ topK = 5 } = {}) {
  const openai = getOpenAIClient()
  const queryEmbeddings = await generateEmbeddings(COMPARISON_QUERIES.map((q) => q.query))

  const results = {
    id: '01-chunk-size-and-overlap',
    name: 'Experiment 01: Chunk Size & Overlap Boundary Benchmark',
    shortName: '01. Chunk Size & Overlap',
    description: 'Evaluates boundary preservation, chunk fragmentation, and context dilution across 100t, 200t, 500t, and 2000t.',
    parameterName: 'Chunk Size',
    corpusName: 'Enterprise Policy & Operations Manual (GEC-2026)',
    topK,
    configs: [],
    questions: [],
  }

  const processedConfigs = []
  for (const cfg of CHUNK_CONFIGS) {
    const chunks = chunkDocumentPages(
      [{ pageNumber: 1, text: corpusText }],
      { targetTokens: cfg.chunkSize, overlapTokens: cfg.overlap }
    )

    const chunkTexts = chunks.map((c) => c.text)
    const chunkVectors = await generateEmbeddings(chunkTexts)
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0)
    const embeddingCost = Number((totalTokens * 0.00000002).toFixed(7))

    processedConfigs.push({
      ...cfg,
      chunks,
      chunkVectors,
      totalTokens,
      embeddingCost,
    })

    results.configs.push({
      id: cfg.id,
      label: cfg.label,
      badge: cfg.badge,
      chunkSize: cfg.chunkSize,
      overlap: cfg.overlap,
      chunkCount: chunks.length,
      totalTokens,
      embeddingCost,
    })
  }

  for (let qIdx = 0; qIdx < COMPARISON_QUERIES.length; qIdx++) {
    const q = COMPARISON_QUERIES[qIdx]
    const qVec = queryEmbeddings[qIdx]
    const configOutputs = []

    for (const pCfg of processedConfigs) {
      const serverStartTime = performance.now()

      const rankedChunks = pCfg.chunks.map((c, idx) => ({
        chunkIndex: c.chunkIndex,
        chunkNum: c.chunkIndex + 1,
        text: c.text,
        page: c.page,
        tokenCount: c.tokenCount,
        score: Number(cosineSimilarity(qVec, pCfg.chunkVectors[idx]).toFixed(4)),
      })).sort((a, b) => b.score - a.score)

      const retrievedChunks = rankedChunks.slice(0, topK)
      const combinedText = retrievedChunks.map((c) => c.text).join('\n\n')

      const factsFound = q.targetFacts.filter((fact) =>
        combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const factsMissed = q.targetFacts.filter(
        (fact) => !combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const recallPercentage = Math.round((factsFound.length / q.targetFacts.length) * 100)

      const contextText = retrievedChunks
        .map((c) => `[Chunk #${c.chunkNum}] Document: "Enterprise Policy Manual" | Page: ${c.page || 1}\nContent:\n"""\n${c.text}\n"""`)
        .join('\n\n')

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
        { role: 'user', content: q.query },
      ]

      const promptInputTokens = apiMessages.reduce(
        (sum, msg) => sum + countTokens(msg.content) + 4,
        0
      )

      let fullResponse = ''
      let firstTokenTimestamp = null
      const streamStartTime = performance.now()

      if (openai) {
        try {
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: 0.2,
            max_completion_tokens: 1024,
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
        } catch (err) {
          fullResponse = `Error: ${err.message}`
        }
      } else {
        firstTokenTimestamp = performance.now() + 30
        fullResponse = retrievedChunks.length > 0
          ? `Based on [Chunk #${retrievedChunks[0].chunkNum}]:\n\n${retrievedChunks[0].text.slice(0, 260)}...`
          : 'I could not find information about that in the uploaded documents.'
      }

      const streamEndTime = performance.now()
      const assistantTokens = countTokens(fullResponse)
      const totalTokens = promptInputTokens + assistantTokens

      const serverTtftMs = firstTokenTimestamp
        ? Math.round(firstTokenTimestamp - serverStartTime)
        : Math.round(streamEndTime - serverStartTime)
      const totalServerDurationMs = Math.round(streamEndTime - serverStartTime)
      const promptCost = promptInputTokens * 0.00000015
      const completionCost = assistantTokens * 0.0000006
      const totalCost = promptCost + completionCost

      configOutputs.push({
        configId: pCfg.id,
        configLabel: pCfg.label,
        badge: pCfg.badge,
        chunkSize: pCfg.chunkSize,
        overlap: pCfg.overlap,
        answer: fullResponse,
        retrievedChunks: retrievedChunks.map((c) => ({
          chunkNum: c.chunkNum,
          text: c.text,
          page: c.page,
          tokenCount: c.tokenCount,
          score: c.score,
        })),
        groundTruth: {
          recallPercentage,
          factsFound,
          factsMissed,
          verdict: recallPercentage === 100 ? 'PASS' : recallPercentage > 0 ? 'PARTIAL' : 'FAIL',
        },
        telemetry: {
          ttftMs: serverTtftMs,
          totalDurationMs: totalServerDurationMs,
          promptTokens: promptInputTokens,
          completionTokens: assistantTokens,
          totalTokens,
          costFormatted: totalCost < 0.00001 ? '<$0.00001' : `$${totalCost.toFixed(5)}`,
          costValue: totalCost,
        },
      })
    }

    results.questions.push({
      id: q.id,
      title: q.title,
      query: q.query,
      targetFacts: q.targetFacts,
      description: q.description,
      comparisons: configOutputs,
    })
  }

  return results
}

/**
 * Run Experiment 02: Top-K Retrieval Depth Benchmark
 */
export async function runTopKComparison() {
  const openai = getOpenAIClient()
  const queryEmbeddings = await generateEmbeddings(COMPARISON_QUERIES.map((q) => q.query))

  // Ingest baseline 500t / 50ov chunks once
  const chunks = chunkDocumentPages(
    [{ pageNumber: 1, text: corpusText }],
    { targetTokens: 500, overlapTokens: 50 }
  )
  const chunkTexts = chunks.map((c) => c.text)
  const chunkVectors = await generateEmbeddings(chunkTexts)
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0)
  const embeddingCost = Number((totalTokens * 0.00000002).toFixed(7))

  const results = {
    id: '02-top-k-retrieval-depth',
    name: 'Experiment 02: Top-K Retrieval Depth Benchmark (K=1, 3, 5, 20)',
    shortName: '02. Top-K Retrieval Depth',
    description: 'Evaluates the trade-off between retrieval recall, TTFT latency, context budget, and prompt cost across depth levels.',
    parameterName: 'Retrieval Depth (K)',
    corpusName: 'Enterprise Policy & Operations Manual (500t / 50ov Baseline)',
    configs: TOP_K_CONFIGS.map((c) => ({
      id: c.id,
      label: c.label,
      badge: c.badge,
      topK: c.topK,
      chunkSize: 500,
      overlap: 50,
      chunkCount: chunks.length,
      totalTokens,
      embeddingCost,
    })),
    questions: [],
  }

  for (let qIdx = 0; qIdx < COMPARISON_QUERIES.length; qIdx++) {
    const q = COMPARISON_QUERIES[qIdx]
    const qVec = queryEmbeddings[qIdx]
    const configOutputs = []

    const rankedChunks = chunks.map((c, idx) => ({
      chunkIndex: c.chunkIndex,
      chunkNum: c.chunkIndex + 1,
      text: c.text,
      page: c.page,
      tokenCount: c.tokenCount,
      score: Number(cosineSimilarity(qVec, chunkVectors[idx]).toFixed(4)),
    })).sort((a, b) => b.score - a.score)

    for (const kCfg of TOP_K_CONFIGS) {
      const serverStartTime = performance.now()
      const retrievedChunks = rankedChunks.slice(0, kCfg.topK)
      const combinedText = retrievedChunks.map((c) => c.text).join('\n\n')

      const factsFound = q.targetFacts.filter((fact) =>
        combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const factsMissed = q.targetFacts.filter(
        (fact) => !combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const recallPercentage = Math.round((factsFound.length / q.targetFacts.length) * 100)

      const contextText = retrievedChunks
        .map((c) => `[Chunk #${c.chunkNum}] Document: "Enterprise Policy Manual" | Page: ${c.page || 1}\nContent:\n"""\n${c.text}\n"""`)
        .join('\n\n')

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
        { role: 'user', content: q.query },
      ]

      const promptInputTokens = apiMessages.reduce(
        (sum, msg) => sum + countTokens(msg.content) + 4,
        0
      )

      let fullResponse = ''
      let firstTokenTimestamp = null
      const streamStartTime = performance.now()

      if (openai) {
        try {
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: 0.2,
            max_completion_tokens: 1024,
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
        } catch (err) {
          fullResponse = `Error: ${err.message}`
        }
      } else {
        firstTokenTimestamp = performance.now() + 30
        fullResponse = retrievedChunks.length > 0
          ? `Based on [Chunk #${retrievedChunks[0].chunkNum}]:\n\n${retrievedChunks[0].text.slice(0, 260)}...`
          : 'I could not find information about that in the uploaded documents.'
      }

      const streamEndTime = performance.now()
      const assistantTokens = countTokens(fullResponse)
      const totalTokens = promptInputTokens + assistantTokens

      const serverTtftMs = firstTokenTimestamp
        ? Math.round(firstTokenTimestamp - serverStartTime)
        : Math.round(streamEndTime - serverStartTime)
      const totalServerDurationMs = Math.round(streamEndTime - serverStartTime)
      const promptCost = promptInputTokens * 0.00000015
      const completionCost = assistantTokens * 0.0000006
      const totalCost = promptCost + completionCost

      configOutputs.push({
        configId: kCfg.id,
        configLabel: kCfg.label,
        badge: kCfg.badge,
        topK: kCfg.topK,
        chunkSize: 500,
        overlap: 50,
        answer: fullResponse,
        retrievedChunks: retrievedChunks.map((c) => ({
          chunkNum: c.chunkNum,
          text: c.text,
          page: c.page,
          tokenCount: c.tokenCount,
          score: c.score,
        })),
        groundTruth: {
          recallPercentage,
          factsFound,
          factsMissed,
          verdict: recallPercentage === 100 ? 'PASS' : recallPercentage > 0 ? 'PARTIAL' : 'FAIL',
        },
        telemetry: {
          ttftMs: serverTtftMs,
          totalDurationMs: totalServerDurationMs,
          promptTokens: promptInputTokens,
          completionTokens: assistantTokens,
          totalTokens,
          costFormatted: totalCost < 0.00001 ? '<$0.00001' : `$${totalCost.toFixed(5)}`,
          costValue: totalCost,
        },
      })
    }

    results.questions.push({
      id: q.id,
      title: q.title,
      query: q.query,
      targetFacts: q.targetFacts,
      description: q.description,
      comparisons: configOutputs,
    })
  }

  return results
}

/**
 * Run and package all experiments together into a master lab bundle
 */
export async function runAllExperiments() {
  const exp1 = await runChunkSizeComparison({ topK: 5 })
  const exp2 = await runTopKComparison()

  return {
    timestamp: new Date().toISOString(),
    experiments: [exp1, exp2],
  }
}
