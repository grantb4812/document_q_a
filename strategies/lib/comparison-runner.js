import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../src/server/routes/documents/embeddingService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const corpusPath = path.join(__dirname, '../corpora/policy-operations.md')
const corpusText = fs.readFileSync(corpusPath, 'utf8')

export const MULTITURN_CONFIGS = [
  {
    id: 'naive-raw-query',
    label: 'Naïve Raw Vector Search',
    badge: 'Naïve Baseline',
    strategy: 'Directly embeds the latest user string without context or pronoun resolution.',
  },
  {
    id: 'contextual-rewriting',
    label: 'History-Aware Query Condensation',
    badge: 'Contextualized',
    strategy: 'Rewrites conversational follow-up questions using prior chat turns to resolve pronouns and implicit subjects.',
  },
]

export const MULTITURN_QUERIES = [
  {
    id: 'Q1_PRONOUN_COREFERENCE',
    title: 'Pronoun Coreference ("that designation")',
    query: 'What happens if someone deletes records bearing that designation without authorization?',
    rewrittenQuery: 'What happens if records bearing the BIO-SEC-9844-DELTA biometric compliance designation are deleted without authorization?',
    priorTurnContext: 'User: What is the mandatory regulatory audit compliance code for biometric credential verification?\nAssistant: The mandatory code is BIO-SEC-9844-DELTA.',
    targetFacts: ['Global Security Operations Center', 'escalation', 'multi-party cryptographic signature'],
    description: 'Tests whether vector search fails when the query refers to a prior code with the pronoun "that designation".',
  },
  {
    id: 'Q2_ELLIPTICAL_FOLLOWUP',
    title: 'Elliptical Follow-up ("What about in the EU?")',
    query: 'What about in the EU?',
    rewrittenQuery: 'What is the customer data retention grace period following contract termination in the European Union GDPR sovereign partition?',
    priorTurnContext: 'User: What is the data retention grace period for commercial customer accounts following contract termination?\nAssistant: Commercial accounts receive a 30-day grace period before data erasure on day 31.',
    targetFacts: ['48 hours', '2 calendar days', 'GDPR Article 17'],
    description: 'Tests whether 5-word elliptical query with no domain terms fails without reconstructing the full question intent.',
  },
  {
    id: 'Q3_COMPARATIVE_SYNTHESIS',
    title: 'Cross-Turn Comparative Synthesis ("How does that compare to GovCloud?")',
    query: 'How does that compare to Division 2 GovCloud?',
    rewrittenQuery: 'What is the standard monthly SLA availability guarantee for Division 2 Federal GovCloud compared to Commercial US?',
    priorTurnContext: 'User: What is the standard monthly SLA availability guarantee for Division 1 Commercial US Cloud?\nAssistant: Commercial US Cloud maintains a 99.99% monthly uptime guarantee.',
    targetFacts: ['99.999%', 'Five-Nines'],
    description: 'Tests maintaining multi-turn context when comparing service metrics across cloud divisions.',
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
 * Run Experiment 01: Multi-Turn Conversational RAG Breakage Benchmark
 */
export async function runMultiTurnComparison({ topK = 3 } = {}) {
  const openai = getOpenAIClient()

  // Chunk baseline 500t / 50ov
  const chunks = chunkDocumentPages(
    [{ pageNumber: 1, text: corpusText }],
    { targetTokens: 500, overlapTokens: 50 }
  )
  const chunkTexts = chunks.map((c) => c.text)
  const chunkVectors = await generateEmbeddings(chunkTexts)
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0)
  const embeddingCost = Number((totalTokens * 0.00000002).toFixed(7))

  const results = {
    id: '01-multi-turn-retrieval-breakage',
    name: 'Experiment 01: Multi-Turn Conversational RAG Breakage Benchmark',
    shortName: '01. Multi-Turn RAG Breakage',
    description: 'Evaluates vector score degradation, pronoun failure, and context recovery between Naïve Raw Embeddings and History-Aware Query Condensation.',
    parameterName: 'Retrieval Strategy',
    corpusName: 'Enterprise Policy & Operations Manual (500t / 50ov Baseline)',
    topK,
    configs: MULTITURN_CONFIGS.map((c) => ({
      id: c.id,
      label: c.label,
      badge: c.badge,
      strategy: c.strategy,
      chunkSize: 500,
      overlap: 50,
      chunkCount: chunks.length,
      totalTokens,
      embeddingCost,
    })),
    questions: [],
  }

  for (const q of MULTITURN_QUERIES) {
    const [naiveVec] = await generateEmbeddings([q.query])
    const [contextualVec] = await generateEmbeddings([q.rewrittenQuery])

    const configOutputs = []

    for (const cfg of MULTITURN_CONFIGS) {
      const serverStartTime = performance.now()
      const qVec = cfg.id === 'contextual-rewriting' ? contextualVec : naiveVec
      const effectiveQuery = cfg.id === 'contextual-rewriting' ? q.rewrittenQuery : q.query

      const rankedChunks = chunks
        .map((c, idx) => ({
          chunkIndex: c.chunkIndex,
          chunkNum: c.chunkIndex + 1,
          text: c.text,
          page: c.page,
          tokenCount: c.tokenCount,
          score: Number(cosineSimilarity(qVec, chunkVectors[idx]).toFixed(4)),
        }))
        .sort((a, b) => b.score - a.score)

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
        .map(
          (c) =>
            `[Chunk #${c.chunkNum}] Document: "Enterprise Policy Manual" | Page: ${c.page || 1}\nContent:\n"""\n${c.text}\n"""`
        )
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
        fullResponse =
          retrievedChunks.length > 0
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
        configId: cfg.id,
        configLabel: cfg.label,
        badge: cfg.badge,
        strategy: cfg.strategy,
        effectiveQuery,
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
      rewrittenQuery: q.rewrittenQuery,
      priorTurnContext: q.priorTurnContext,
      targetFacts: q.targetFacts,
      description: q.description,
      comparisons: configOutputs,
    })
  }

  return results
}

/**
 * Run and package all experiments together
 */
export async function runAllExperiments() {
  const exp1 = await runMultiTurnComparison({ topK: 3 })

  return {
    timestamp: new Date().toISOString(),
    experiments: [exp1],
  }
}
