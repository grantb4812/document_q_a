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

export async function runSideBySideComparison({ topK = 5 } = {}) {
  const openai = getOpenAIClient()
  const queryEmbeddings = await generateEmbeddings(COMPARISON_QUERIES.map((q) => q.query))

  const results = {
    timestamp: new Date().toISOString(),
    corpusName: 'Enterprise Policy & Operations Manual (GEC-2026)',
    topK,
    configs: [],
    questions: [],
  }

  // Pre-process each chunking configuration
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

  // Run each query across all chunk configurations
  for (let qIdx = 0; qIdx < COMPARISON_QUERIES.length; qIdx++) {
    const q = COMPARISON_QUERIES[qIdx]
    const qVec = queryEmbeddings[qIdx]
    const configOutputs = []

    for (const pCfg of processedConfigs) {
      const serverStartTime = performance.now()

      // Rank chunks
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

      // Check ground truth presence
      const factsFound = q.targetFacts.filter((fact) =>
        combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const factsMissed = q.targetFacts.filter(
        (fact) => !combinedText.toLowerCase().includes(fact.toLowerCase())
      )
      const recallPercentage = Math.round((factsFound.length / q.targetFacts.length) * 100)

      // Prompt construction
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
          fullResponse = `Error during LLM generation: ${err.message}`
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
      const prefillDurationMs = firstTokenTimestamp
        ? Math.round(firstTokenTimestamp - streamStartTime)
        : 0
      const generationDurationMs = firstTokenTimestamp
        ? Math.round(streamEndTime - firstTokenTimestamp)
        : Math.round(streamEndTime - streamStartTime)

      const promptCost = promptInputTokens * 0.00000015
      const completionCost = assistantTokens * 0.0000006
      const totalCost = promptCost + completionCost
      const formattedCost = totalCost < 0.00001 ? '<$0.00001' : `$${totalCost.toFixed(5)}`

      configOutputs.push({
        configId: pCfg.id,
        configLabel: pCfg.label,
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
          prefillMs: prefillDurationMs,
          generationMs: generationDurationMs,
          promptTokens: promptInputTokens,
          completionTokens: assistantTokens,
          totalTokens,
          costFormatted: formattedCost,
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
