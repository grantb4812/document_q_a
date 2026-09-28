import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chunkDocumentPages, countTokens } from '../../../src/server/routes/documents/tokenChunker.js'
import { generateEmbeddings, getOpenAIClient } from '../../../src/server/routes/documents/embeddingService.js'
import { getRecentMessagesWithTokenBudget, saveMessage, clearMessages } from '../../../src/server/routes/chat/messagesHelper.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseCorpusPath = path.join(__dirname, '../../corpora/policy-operations.md')
const baseCorpusText = fs.readFileSync(baseCorpusPath, 'utf8')

// Create realistic multi-division enterprise manual (~15,000 tokens)
const corpusText = [
  baseCorpusText,
  baseCorpusText.replace(/DIVISION 1/g, 'DIVISION 4: APAC').replace(/GEC-US/g, 'GEC-APAC'),
  baseCorpusText.replace(/DIVISION 1/g, 'DIVISION 5: LATAM').replace(/GEC-US/g, 'GEC-LATAM'),
  baseCorpusText.replace(/DIVISION 1/g, 'DIVISION 6: OCEANIA').replace(/GEC-US/g, 'GEC-OCEANIA'),
].join('\n\n---\n\n')

// Production constants matching src/server/routes/chat/route.js
const MAX_PROMPT_BUDGET = 12000
const RESERVED_OUTPUT_TOKENS = 2048

// Three parameter configurations demonstrating token budget exhaustion and history eviction
const EVAL_CONFIGS = [
  {
    id: 'GREEDY_STARVATION',
    label: 'Greedy Chunk Ingestion (Top-K = 12, Chunk Size = 1000t)',
    chunkSize: 1000,
    overlap: 100,
    topK: 12,
    description: '12 chunks × 1000 tokens = ~11,500 context tokens + 2048 reserved output. Completely drops history budget to 0 tokens.',
  },
  {
    id: 'MODERATE_AGGRESSIVE_EVICTION',
    label: 'Aggressive Sliding Drop (Medium Chunk Size & Medium Top-K)',
    chunkSize: 800,
    overlap: 80,
    topK: 6,
    description: '6 chunks × 800 tokens = ~5,000 context tokens. Rapidly evicts older turns after turn 2.',
  },
  {
    id: 'BALANCED_PROTECTED',
    label: 'Balanced Token Budget (Optimized Chunk Size & Top-K)',
    chunkSize: 400,
    overlap: 40,
    topK: 3,
    description: '3 chunks × 400 tokens = ~1,200 context tokens. Preserves large multi-turn history buffer (>8,500 tokens).',
  },
]

// 4-turn sequential conversation where later turns explicitly require earlier conversational context
const CONVERSATION_SCENARIO = [
  {
    turn: 1,
    userQuery: 'What is the base monthly seat rate for the Tier-3 Platinum plan?',
    expectedFactInTurn: '$175 / user / mo',
    requiresHistory: false,
    historyReference: null,
  },
  {
    turn: 2,
    userQuery: 'What is the storage allocation and dedicated bandwidth for that same plan?',
    expectedFactInTurn: '50 TB NVMe SSD and 25.0 Gbps Dedicated',
    requiresHistory: true,
    historyReference: 'Must know "that same plan" refers to Tier-3 Platinum from Turn 1',
  },
  {
    turn: 3,
    userQuery: 'If our company has 50 users on it, what is our total base monthly expenditure?',
    expectedFactInTurn: '$8,750 (50 users × $175)',
    requiresHistory: true,
    historyReference: 'Must remember the $175 rate from Turn 1 to compute 50 × 175 = $8,750',
  },
  {
    turn: 4,
    userQuery: 'Can you summarize all 3 specs and our calculated monthly total from our discussion?',
    expectedFactInTurn: 'Tier-3 Platinum: $175/seat, 25 Gbps, 50 TB, Total = $8,750/mo',
    requiresHistory: true,
    historyReference: 'Requires full 3-turn historical transcript',
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

async function runBudgetGreedinessExperiment() {
  console.log('='.repeat(90))
  console.log('🔬 MULTI-TURN RAG BREAKAGE: CHUNK TOKEN GREEDINESS & CONTEXT EVICTION BENCHMARK')
  console.log('='.repeat(90))
  console.log(`Global Settings: MAX_PROMPT_BUDGET = ${MAX_PROMPT_BUDGET} | RESERVED_OUTPUT = ${RESERVED_OUTPUT_TOKENS}`)
  console.log('='.repeat(90))

  const openai = getOpenAIClient()
  const results = []

  for (const config of EVAL_CONFIGS) {
    console.log(`\n\n${'#'.repeat(90)}`)
    console.log(`⚙️  CONFIGURATION: ${config.label}`)
    console.log(`   Params: Chunk Size = ${config.chunkSize}t | Overlap = ${config.overlap}t | Top-K = ${config.topK}`)
    console.log(`   Hypothesis: ${config.description}`)
    console.log(`${'#'.repeat(90)}`)

    // 1. Chunk and embed corpus document
    const pages = [{ pageNumber: 1, text: corpusText }]
    const chunks = chunkDocumentPages(pages, {
      targetTokens: config.chunkSize,
      overlapTokens: config.overlap,
    })
    const chunkTexts = chunks.map((c) => c.text)
    const chunkVectors = await generateEmbeddings(chunkTexts)

    const conversationId = `exp-budget-${config.id.toLowerCase()}`
    clearMessages(conversationId)

    const turnResults = []

    for (const turn of CONVERSATION_SCENARIO) {
      console.log(`\n▶ [TURN ${turn.turn}] User: "${turn.userQuery}"`)
      if (turn.requiresHistory) {
        console.log(`   🔗 Dependency: ${turn.historyReference}`)
      }

      const userMsgId = `user_${turn.turn}_${Date.now()}`
      const userTokens = countTokens(turn.userQuery)

      // Step 1: Vector Retrieval via Cosine Match
      const [queryVector] = await generateEmbeddings([turn.userQuery])
      const rankedChunks = chunks
        .map((c, idx) => ({
          chunkIndex: c.chunkIndex,
          text: c.text,
          tokenCount: c.tokenCount,
          score: Number(cosineSimilarity(queryVector, chunkVectors[idx]).toFixed(4)),
        }))
        .sort((a, b) => b.score - a.score)

      const retrievedChunks = rankedChunks.slice(0, config.topK)
      const retrievedTokens = retrievedChunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)

      // Step 2: Construct RAG System Prompt
      const contextText = retrievedChunks
        .map((c, i) => `[Chunk #${c.chunkIndex + 1}]\nContent:\n"""\n${c.text}\n"""`)
        .join('\n\n')

      const systemPrompt = `You are a helpful, precise AI assistant for a Document Q&A application.
Answer the user's question accurately using ONLY the provided retrieved context sources below.
If the question references prior conversation, use the prior messages and current context cohesively.

Retrieved Context Sources:
${contextText}`

      const systemTokens = countTokens(systemPrompt)

      // Step 3: Exact Production Budget Calculation from src/server/routes/chat/route.js
      const remainingHistoryBudget = Math.max(
        0,
        MAX_PROMPT_BUDGET - systemTokens - userTokens - RESERVED_OUTPUT_TOKENS
      )

      // Step 4: Fetch sliding window history fitting within budget
      const history = getRecentMessagesWithTokenBudget(
        conversationId,
        remainingHistoryBudget,
        userMsgId
      )

      const historyTokens = history.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
      const totalAllStoredHistory = getRecentMessagesWithTokenBudget(conversationId, 999999, userMsgId)
      const droppedTurnsCount = totalAllStoredHistory.length - history.length

      console.log(`  📊 Token Budget Breakdown:`)
      console.log(`     • Retrieved Context Chunks (${config.topK} chunks) : ${retrievedTokens} tokens (System Prompt: ${systemTokens} tokens)`)
      console.log(`     • Reserved Output Capacity               : ${RESERVED_OUTPUT_TOKENS} tokens`)
      console.log(`     • User Turn Question Tokens              : ${userTokens} tokens`)
      console.log(`     ─────────────────────────────────────────────────────────────────`)
      console.log(`     • 🛑 REMAINING HISTORY BUDGET AVAILABLE  : ${remainingHistoryBudget} tokens`)
      console.log(`     • 📜 History Turns Retained for LLM      : ${history.length} / ${totalAllStoredHistory.length} turns (${historyTokens} tokens)`)
      if (droppedTurnsCount > 0) {
        console.log(`     • ⚠️  TURNS DROPPED / EVICTED FROM CONTEXT : ${droppedTurnsCount} turns [CONTEXT LOSS!]`)
      } else {
        console.log(`     • ✅ No History Evicted (Full Memory Intact)`)
      }

      // Step 5: Call LLM (if OpenAI client available)
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: turn.userQuery },
      ]

      let assistantAnswer = 'Simulated response'
      if (openai) {
        try {
          const res = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: 0.1,
            max_completion_tokens: 1024,
          })
          assistantAnswer = res.choices[0]?.message?.content || ''
        } catch (err) {
          assistantAnswer = `Error: ${err.message}`
        }
      }

      console.log(`  🤖 Assistant Generation:`)
      console.log(`     "${assistantAnswer.replace(/\n+/g, ' ').slice(0, 180)}..."`)

      // Step 6: Persist turn in database for multi-turn history accumulation
      const asstTokens = countTokens(assistantAnswer)
      saveMessage({
        id: userMsgId,
        conversationId,
        role: 'user',
        content: turn.userQuery,
        tokenCount: userTokens,
      })

      saveMessage({
        id: `asst_${turn.turn}_${Date.now()}`,
        conversationId,
        role: 'assistant',
        content: assistantAnswer,
        tokenCount: asstTokens,
      })

      turnResults.push({
        turn: turn.turn,
        userQuery: turn.userQuery,
        requiresHistory: turn.requiresHistory,
        systemTokens,
        retrievedTokens,
        remainingHistoryBudget,
        retainedTurns: history.length,
        totalStoredTurns: totalAllStoredHistory.length,
        droppedTurns: droppedTurnsCount,
        assistantAnswer,
      })
    }

    results.push({
      configId: config.id,
      label: config.label,
      chunkSize: config.chunkSize,
      topK: config.topK,
      turns: turnResults,
    })
  }

  // Save experiment results
  const resultsDir = path.join(__dirname, 'results')
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
  const outputPath = path.join(resultsDir, 'budget-greediness-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log(`\n\n✅ Experiment Execution Complete! Results written to:\n${outputPath}`)
}

runBudgetGreedinessExperiment().catch((err) => {
  console.error('Fatal execution error:', err)
  process.exit(1)
})
