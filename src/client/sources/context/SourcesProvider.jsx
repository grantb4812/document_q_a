import { useReducer, useCallback, useEffect } from 'react'
import { SourcesContext } from './sourcesContextInstance'
import { SOURCES_ACTIONS, PROCESSING_STEPS } from '../constants/sourcesConstants'
import { sourcesReducer, initialSourcesState } from './sourcesReducer'
import { uploadDocument, getDocuments, deleteDocument, deleteAllDocuments } from '../services/documentService'

export function SourcesProvider({ children }) {
  const [state, dispatch] = useReducer(sourcesReducer, initialSourcesState)

  const loadDocuments = useCallback(async () => {
    dispatch({ type: SOURCES_ACTIONS.LOAD_DOCUMENTS_START })
    try {
      const docs = await getDocuments()
      dispatch({
        type: SOURCES_ACTIONS.LOAD_DOCUMENTS_SUCCESS,
        payload: docs,
      })
    } catch (err) {
      console.error('[SourcesContext] Failed to load documents:', err)
      dispatch({
        type: SOURCES_ACTIONS.LOAD_DOCUMENTS_ERROR,
        payload: err.message,
      })
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    const eventSource = new EventSource('api/documents/upload')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.status === 'processing') {
          dispatch({
            type: SOURCES_ACTIONS.UPDATE_PROCESSING_STEP,
            payload: { id: data.id, filename: data.filename, step: data.step, stepIndex: data.stepIndex },
          })
        } else if (data.status === 'complete') {
          dispatch({
            type: SOURCES_ACTIONS.UPLOAD_SUCCESS,
            payload: { id: data.id, filename: data.filename },
          })
          loadDocuments()
        } else if (data.status === 'error') {
          dispatch({
            type: SOURCES_ACTIONS.UPLOAD_ERROR,
            payload: { id: data.id, filename: data.filename, error: data.error },
          })
        }
      } catch (err) {
        console.error('[SourcesContext] Failed to parse SSE event:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[SourcesContext] EventSource error:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [loadDocuments])

  const handleUploadDocument = useCallback(async (file, options = {}) => {
    if (!file) return

    dispatch({
      type: SOURCES_ACTIONS.UPLOAD_START,
      payload: {
        id: `upload_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing',
        currentStep: 'Saving document',
        stepIndex: 0,
        chunk_size: options.chunkSize,
        overlap: options.overlap,
      },
    })

    try {
      await uploadDocument(file, options)
    } catch (err) {
      console.error('[SourcesContext] Upload failed:', err)
      dispatch({
        type: SOURCES_ACTIONS.UPLOAD_ERROR,
        payload: { filename: file.name, error: err.message },
      })
    }
  }, [])


  const handleDeleteDocument = useCallback(async (id) => {
    if (!id) return
    try {
      await deleteDocument(id)
      dispatch({
        type: SOURCES_ACTIONS.DELETE_DOCUMENT,
        payload: { id },
      })
    } catch (err) {
      console.error('[SourcesContext] Delete failed:', err)
    }
  }, [])

  const handleDeleteAllDocuments = useCallback(async () => {
    try {
      await deleteAllDocuments()
      dispatch({
        type: SOURCES_ACTIONS.DELETE_ALL_DOCUMENTS,
      })
    } catch (err) {
      console.error('[SourcesContext] Delete all failed:', err)
    }
  }, [])

  const value = {
    sources: state.sources,
    isLoading: state.isLoading,
    error: state.error,
    uploadDocument: handleUploadDocument,
    deleteDocument: handleDeleteDocument,
    deleteAllDocuments: handleDeleteAllDocuments,
    loadDocuments,
  }

  return (
    <SourcesContext.Provider value={value}>
      {children}
    </SourcesContext.Provider>
  )
}

export default SourcesProvider
