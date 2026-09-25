import OpenAI from 'openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSION = 1536
const BATCH_SIZE = 64

let openaiClient = null

export function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

/**
 * Generates vector embeddings for a list of text strings.
 * Batches calls to OpenAI text-embedding-3-small.
 *
 * @param {string[]} texts - Array of chunk texts
 * @returns {Promise<Float32Array[]>} - Array of 1536-dimensional float vectors
 */
export async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) {
    return []
  }

  const client = getOpenAIClient()

  // If no OpenAI API key is configured, generate deterministic mock vectors for local testing
  if (!client) {
    console.warn(
      '[embeddingService] Warning: OPENAI_API_KEY is not set. Generating deterministic test embeddings.'
    )
    return texts.map((text) => createDeterministicMockEmbedding(text))
  }

  const allEmbeddings = []

  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      encoding_format: 'float',
    })

    for (const item of response.data) {
      allEmbeddings.push(new Float32Array(item.embedding))
    }
  }

  return allEmbeddings
}

/**
 * Fallback deterministic embedding generator when OPENAI_API_KEY is not set
 */
function createDeterministicMockEmbedding(text) {
  const vec = new Float32Array(EMBEDDING_DIMENSION)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }

  let norm = 0
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    const val = Math.sin(hash + i)
    vec[i] = val
    norm += val * val
  }

  // Normalize vector
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    vec[i] /= norm
  }

  return vec
}
