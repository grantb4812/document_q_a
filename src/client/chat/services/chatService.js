/**
 * Send a chat message to the server to trigger streaming response.
 *
 * @param {string} message - User message text
 * @returns {Promise<any>}
 */
export async function sendChatMessage(message) {
  const response = await fetch('api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}
