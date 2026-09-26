import { useReducer, useCallback, useEffect } from 'react'
import { QaContext } from './qaContextInstance'
import { QA_ACTIONS } from '../constants/qaConstants'
import { qaReducer, initialQaState } from './qaReducer'
import { sendQaMessage, fetchChatHistory, clearChatHistory } from '../services/qaService'
import { useSettings } from '../../settings/context/useSettings'

export function QaProvider({ children }) {
  const [state, dispatch] = useReducer(qaReducer, initialQaState)
  const { topK } = useSettings()

  // 1. Fetch conversation history on mount
  useEffect(() => {
    let isMounted = true

    async function loadHistory() {
      try {
        const data = await fetchChatHistory('default')
        if (isMounted && data?.messages?.length > 0) {
          dispatch({
            type: QA_ACTIONS.SET_MESSAGES_HISTORY,
            payload: { messages: data.messages },
          })
        }
      } catch (err) {
        console.warn('[QaContext] Could not load initial chat history:', err.message)
      }
    }

    loadHistory()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Establish SSE connection for streaming chat and retrieval events
  useEffect(() => {
    let eventSource = null
    let reconnectTimeout = null

    const connect = () => {
      eventSource = new EventSource('api/chat/stream')

      eventSource.onopen = () => {
        dispatch({ type: QA_ACTIONS.SET_CONNECTION_STATUS, payload: true })
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'start':
              dispatch({
                type: QA_ACTIONS.START_ASSISTANT_MESSAGE,
                payload: {
                  messageId: data.messageId,
                  timestamp: data.timestamp,
                  clientStartTime: performance.now(),
                },
              })
              break

            case 'retrieval_start':
              dispatch({
                type: QA_ACTIONS.START_RETRIEVAL,
                payload: { messageId: data.messageId, query: data.query },
              })
              break

            case 'retrieval_chunks':
            case 'retrieval':
              dispatch({
                type: QA_ACTIONS.SET_RETRIEVAL_CHUNKS,
                payload: {
                  messageId: data.messageId,
                  query: data.query,
                  chunks: data.chunks || [],
                },
              })
              break

            case 'chunk':
              dispatch({
                type: QA_ACTIONS.APPEND_ASSISTANT_CHUNK,
                payload: { messageId: data.messageId, chunk: data.chunk },
              })
              break

            case 'done':
              dispatch({
                type: QA_ACTIONS.FINISH_ASSISTANT_MESSAGE,
                payload: {
                  messageId: data.messageId,
                  fullText: data.fullText,
                  metrics: data.metrics || null,
                },
              })
              break

            case 'error':
              dispatch({
                type: QA_ACTIONS.SET_CHAT_ERROR,
                payload: { messageId: data.messageId, error: data.error },
              })
              dispatch({
                type: QA_ACTIONS.SET_RETRIEVAL_ERROR,
                payload: { error: data.error },
              })
              break

            default:
              console.log('[QaContext] Unknown event type received:', data.type, data)
          }
        } catch (err) {
          console.error('[QaContext] Failed to parse SSE event:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[QaContext] EventSource error / disconnected:', err)
        dispatch({ type: QA_ACTIONS.SET_CONNECTION_STATUS, payload: false })
      }
    }

    connect()

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (eventSource) eventSource.close()
    }
  }, [])

  const handleSendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || state.isStreaming) return

      const trimmed = text.trim()
      const userMsgId = `user_${Date.now()}`

      // 1. Add user message to chat state
      dispatch({
        type: QA_ACTIONS.ADD_USER_MESSAGE,
        payload: { id: userMsgId, content: trimmed },
      })

      // 2. Set retrieval to loading state with active query
      dispatch({
        type: QA_ACTIONS.START_RETRIEVAL,
        payload: { query: trimmed },
      })

      try {
        await sendQaMessage(trimmed, 'default', topK)
      } catch (err) {
        console.error('[QaContext] Send message failed:', err)
        dispatch({
          type: QA_ACTIONS.SET_CHAT_ERROR,
          payload: { error: err.message },
        })
        dispatch({
          type: QA_ACTIONS.SET_RETRIEVAL_ERROR,
          payload: { error: err.message },
        })
      }
    },
    [state.isStreaming, topK]
  )

  const handleClearChat = useCallback(async () => {
    dispatch({ type: QA_ACTIONS.CLEAR_CHAT })
    try {
      await clearChatHistory('default')
    } catch (err) {
      console.warn('[QaContext] Failed to clear chat history on server:', err.message)
    }
  }, [])

  const handleClearRetrieval = useCallback(() => {
    dispatch({ type: QA_ACTIONS.CLEAR_RETRIEVAL })
  }, [])

  const handleToggleRetrievalGroup = useCallback((messageId) => {
    dispatch({ type: QA_ACTIONS.TOGGLE_RETRIEVAL_GROUP, payload: { messageId } })
  }, [])

  const handleSelectMessageRetrieval = useCallback((messageId) => {
    if (!messageId) return
    dispatch({ type: QA_ACTIONS.FOCUS_RETRIEVAL_GROUP, payload: { messageId } })

    // Smoothly scroll the associated group in the Retrieval panel into view
    setTimeout(() => {
      const element = document.getElementById(`retrieval-group-${messageId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 60)
  }, [])

  const value = {
    // Chat state & controls
    messages: state.messages,
    isStreaming: state.isStreaming,
    chatError: state.chatError,
    sendMessage: handleSendMessage,
    clearChat: handleClearChat,

    // Retrieval state & controls
    retrieval: state.retrieval,
    retrievalChunks: state.retrieval.chunks,
    isRetrieving: state.retrieval.isLoading,
    retrievalQuery: state.retrieval.query,
    retrievalError: state.retrieval.error,
    expandedGroupMessageId: state.retrieval.expandedGroupMessageId,
    activeGroupMessageId: state.retrieval.activeGroupMessageId,
    toggleRetrievalGroup: handleToggleRetrievalGroup,
    selectMessageRetrieval: handleSelectMessageRetrieval,

    clearRetrieval: handleClearRetrieval,

    // Connection
    isConnected: state.isConnected,
  }

  return <QaContext.Provider value={value}>{children}</QaContext.Provider>
}

export default QaProvider
