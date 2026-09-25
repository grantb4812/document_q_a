import { SOURCES_ACTIONS, PROCESSING_STEPS } from '../constants/sourcesConstants'

export const initialSourcesState = {
  sources: [],
  isLoading: false,
  error: null,
}

export function sourcesReducer(state, action) {
  switch (action.type) {
    case SOURCES_ACTIONS.LOAD_DOCUMENTS_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case SOURCES_ACTIONS.LOAD_DOCUMENTS_SUCCESS: {
      const activeUploads = state.sources.filter((s) => s.status === 'processing')
      const loadedDocs = action.payload || []
      const activeIds = new Set(activeUploads.map((s) => s.id))
      const mergedSources = [
        ...activeUploads,
        ...loadedDocs.filter((d) => !activeIds.has(d.id)),
      ]
      return {
        ...state,
        isLoading: false,
        sources: mergedSources,
      }
    }

    case SOURCES_ACTIONS.LOAD_DOCUMENTS_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      }

    case SOURCES_ACTIONS.UPLOAD_START:
      return {
        ...state,
        sources: [
          action.payload,
          ...state.sources,
        ],
      }

    case SOURCES_ACTIONS.UPDATE_PROCESSING_STEP: {
      const match = (s) =>
        (action.payload.id != null && s.id === action.payload.id) ||
        (action.payload.filename && s.name === action.payload.filename)

      const exists = state.sources.some(match)
      if (!exists) {
        return {
          ...state,
          sources: [
            {
              id: action.payload.id || action.payload.filename,
              name: action.payload.filename || 'Document',
              status: 'processing',
              currentStep: action.payload.step,
              stepIndex: action.payload.stepIndex,
            },
            ...state.sources,
          ],
        }
      }

      return {
        ...state,
        sources: state.sources.map((source) =>
          match(source)
            ? {
                ...source,
                id: action.payload.id || source.id,
                currentStep: action.payload.step,
                stepIndex: action.payload.stepIndex,
              }
            : source
        ),
      }
    }

    case SOURCES_ACTIONS.UPLOAD_SUCCESS: {
      const match = (s) =>
        (action.payload.id != null && s.id === action.payload.id) ||
        (action.payload.filename && s.name === action.payload.filename)

      return {
        ...state,
        sources: state.sources.map((source) =>
          match(source)
            ? {
                ...source,
                id: action.payload.id || source.id,
                status: 'complete',
                currentStep: 'Complete',
                stepIndex: PROCESSING_STEPS.length - 1,
              }
            : source
        ),
      }
    }

    case SOURCES_ACTIONS.UPLOAD_ERROR: {
      const match = (s) =>
        (action.payload.id != null && s.id === action.payload.id) ||
        (action.payload.filename && s.name === action.payload.filename)

      return {
        ...state,
        sources: state.sources.map((source) =>
          match(source)
            ? {
                ...source,
                id: action.payload.id || source.id,
                status: 'error',
                error: action.payload.error,
              }
            : source
        ),
      }
    }

    case SOURCES_ACTIONS.DELETE_DOCUMENT:
      return {
        ...state,
        sources: state.sources.filter((source) => source.id !== action.payload.id),
      }

    case SOURCES_ACTIONS.DELETE_ALL_DOCUMENTS:
      return {
        ...state,
        sources: [],
      }

    default:
      return state
  }
}
