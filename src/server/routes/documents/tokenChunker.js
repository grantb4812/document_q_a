import { getEncoding } from 'js-tiktoken'

// Cache the tokenizer instance (cl100k_base is used by text-embedding-3-small and text-embedding-3-large)
let cachedEncoding = null

export function getTokenizer() {
  if (!cachedEncoding) {
    cachedEncoding = getEncoding('cl100k_base')
  }
  return cachedEncoding
}

/**
 * Returns the exact token count for a string using cl100k_base.
 *
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  if (!text) return 0
  const tokenizer = getTokenizer()
  return tokenizer.encode(text).length
}

/**
 * Chunks a list of document pages/sections based on a fixed token count.
 *
 * @param {Array<{ page: number|null, text: string }>} pages - Extracted pages
 * @param {object} [options]
 * @param {number} [options.targetTokens=500] - Target tokens per chunk
 * @param {number} [options.overlapTokens=50] - Number of overlapping tokens between consecutive chunks
 * @returns {Array<{ chunkIndex: number, text: string, start: number, end: number, page: number|null, tokenCount: number }>}
 */
export function chunkDocumentPages(pages, { targetTokens = 500, overlapTokens = 50 } = {}) {
  const tokenizer = getTokenizer()
  const chunks = []
  let globalChunkIndex = 0

  for (const pageItem of pages) {
    const pageText = pageItem.text || ''
    if (!pageText.trim()) continue

    const tokens = tokenizer.encode(pageText)
    if (tokens.length === 0) continue

    // If page fits within one chunk
    if (tokens.length <= targetTokens) {
      chunks.push({
        chunkIndex: globalChunkIndex++,
        text: pageText,
        start: 0,
        end: pageText.length,
        page: pageItem.page,
        tokenCount: tokens.length,
      })
      continue
    }

    // Slide over the tokens
    const step = Math.max(1, targetTokens - overlapTokens)
    let tokenStart = 0
    let lastCharSearchPos = 0

    while (tokenStart < tokens.length) {
      const tokenEnd = Math.min(tokenStart + targetTokens, tokens.length)
      const tokenSlice = tokens.slice(tokenStart, tokenEnd)
      const chunkText = tokenizer.decode(tokenSlice)

      // Calculate approximate/exact character offsets within the page text
      const charIndex = pageText.indexOf(chunkText.slice(0, Math.min(50, chunkText.length)), lastCharSearchPos)
      const startChar = charIndex !== -1 ? charIndex : Math.max(0, lastCharSearchPos)
      const endChar = Math.min(startChar + chunkText.length, pageText.length)
      lastCharSearchPos = startChar

      chunks.push({
        chunkIndex: globalChunkIndex++,
        text: chunkText,
        start: startChar,
        end: endChar,
        page: pageItem.page,
        tokenCount: tokenSlice.length,
      })

      // If we reached the end of the tokens array, break
      if (tokenEnd >= tokens.length) {
        break
      }

      tokenStart += step
    }
  }

  return chunks
}
