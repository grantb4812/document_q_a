/**
 * Fetch application settings from the backend
 *
 * @returns {Promise<{ chunkSize: number, overlap: number, topK: number, model: string }>}
 */
export async function fetchSettings() {
  const response = await fetch('api/settings')
  if (!response.ok) {
    throw new Error(`Failed to load settings: ${response.status}`)
  }
  const data = await response.json()
  return data.settings
}

/**
 * Update application settings on the backend
 *
 * @param {object} updates - Partial settings to update
 * @returns {Promise<any>}
 */
export async function saveSettings(updates) {
  const response = await fetch('api/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to save settings: ${response.status}`)
  }

  const data = await response.json()
  return data.settings
}
