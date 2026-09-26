/**
 * Send a user query to the server to trigger retrieval and streaming chat response.
 *
 * @param {string} message - User message query text
 * @param {string} [conversationId='default']
 * @param {number} [topK] - Number of chunks to retrieve
 * @returns {Promise<any>}
 */
export async function sendQaMessage(message, conversationId = 'default', topK = null) {
  const payload = { message, conversationId }
  if (topK) payload.topK = topK

  const response = await fetch('api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}


/**
 * Fetch existing conversation messages from the server.
 *
 * @param {string} [conversationId='default']
 * @returns {Promise<{ messages: Array<any> }>}
 */
export async function fetchChatHistory(conversationId = 'default') {
  const response = await fetch(`api/chat/history?conversationId=${encodeURIComponent(conversationId)}`)
  if (!response.ok) {
    throw new Error(`Failed to load chat history: ${response.status}`)
  }
  return response.json()
}

/**
 * Clear conversation history on the server.
 *
 * @param {string} [conversationId='default']
 * @returns {Promise<any>}
 */
export async function clearChatHistory(conversationId = 'default') {
  const response = await fetch(`api/chat/history?conversationId=${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to clear chat history: ${response.status}`)
  }
  return response.json()
}
