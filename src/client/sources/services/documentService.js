import { PROCESSING_STEPS } from '../constants/sourcesConstants'

/**
 * Fetch existing documents directly from the API.
 *
 * @returns {Promise<Array<any>>}
 */
export async function getDocuments() {
  const response = await fetch('api/documents')
  const data = await response.json()
  return data.documents
}

/**
 * Upload a document.
 *
 * @param {File} file - The file to upload
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<any>}
 */
export async function uploadDocument(file, signal) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('api/documents/upload', {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Upload failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Delete a single document by ID.
 *
 * @param {number|string} id - Document ID
 * @returns {Promise<any>}
 */
export async function deleteDocument(id) {
  const response = await fetch(`api/documents/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Delete failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Delete all documents.
 *
 * @returns {Promise<any>}
 */
export async function deleteAllDocuments() {
  const response = await fetch('api/documents', {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Delete all failed with status ${response.status}`)
  }

  return response.json()
}
