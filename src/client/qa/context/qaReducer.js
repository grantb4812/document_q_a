import { QA_ACTIONS } from '../constants/qaConstants'

export const initialQaState = {
  // Chat state
  messages: [],
  isStreaming: false,
  chatError: null,

  // Retrieval state
  retrieval: {
    query: null,
    chunks: [],
    isLoading: false,
    error: null,
    messageId: null,
    expandedGroupMessageId: null, // ONLY one message group is open at a time
    activeGroupMessageId: null, // messageId currently focused / highlighted
  },

  // Connection state
  isConnected: false,
}

export function qaReducer(state, action) {
  switch (action.type) {
    // ----------------------------------------------------
    // CHAT ACTIONS
    // ----------------------------------------------------
    case QA_ACTIONS.ADD_USER_MESSAGE:
      return {
        ...state,
        chatError: null,
        messages: [
          ...state.messages,
          {
            id: action.payload.id || `user_${Date.now()}`,
            role: 'user',
            content: action.payload.content,
            timestamp: action.payload.timestamp || new Date().toISOString(),
          },
        ],
      }

    case QA_ACTIONS.START_ASSISTANT_MESSAGE: {
      const existing = state.messages.find((m) => m.id === action.payload.messageId)
      if (existing) {
        return {
          ...state,
          isStreaming: true,
          chatError: null,
        }
      }
      return {
        ...state,
        isStreaming: true,
        chatError: null,
        messages: [
          ...state.messages,
          {
            id: action.payload.messageId,
            role: 'assistant',
            content: '',
            status: 'streaming',
            timestamp: action.payload.timestamp || new Date().toISOString(),
            retrievedChunks: [],
            metrics: null,
            clientStartTime: action.payload.clientStartTime || performance.now(),
            clientTtftMs: null,
          },
        ],
      }
    }

    case QA_ACTIONS.APPEND_ASSISTANT_CHUNK:
      return {
        ...state,
        messages: state.messages.map((msg) => {
          if (msg.id !== action.payload.messageId) return msg

          const clientTtft =
            msg.clientTtftMs === null && msg.clientStartTime
              ? Math.round(performance.now() - msg.clientStartTime)
              : msg.clientTtftMs

          return {
            ...msg,
            content: msg.content + action.payload.chunk,
            clientTtftMs: clientTtft,
          }
        }),
      }

    case QA_ACTIONS.FINISH_ASSISTANT_MESSAGE:
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((msg) => {
          if (msg.id !== action.payload.messageId) return msg

          const clientTotalDuration = msg.clientStartTime
            ? Math.round(performance.now() - msg.clientStartTime)
            : null

          const mergedMetrics = action.payload.metrics
            ? {
                ...action.payload.metrics,
                clientTtftMs: msg.clientTtftMs || action.payload.metrics.ttftMs,
                clientTotalDurationMs: clientTotalDuration || action.payload.metrics.totalDurationMs,
              }
            : msg.metrics

          return {
            ...msg,
            status: 'complete',
            content: action.payload.fullText ?? msg.content,
            metrics: mergedMetrics,
          }
        }),
      }

    case QA_ACTIONS.SET_CHAT_ERROR:
      return {
        ...state,
        isStreaming: false,
        chatError: action.payload.error,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.messageId
            ? {
                ...msg,
                status: 'error',
                error: action.payload.error,
              }
            : msg
        ),
      }

    case QA_ACTIONS.SET_STREAMING:
      return {
        ...state,
        isStreaming: action.payload,
      }

    case QA_ACTIONS.SET_MESSAGES_HISTORY: {
      const historyMessages = action.payload.messages || []
      const lastAssistantWithChunks = [...historyMessages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.retrievedChunks && m.retrievedChunks.length > 0)

      const latestId = lastAssistantWithChunks?.id || null

      return {
        ...state,
        messages: historyMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          status: 'complete',
          timestamp: m.createdAt || m.created_at || new Date().toISOString(),
          retrievedChunks: m.retrievedChunks || [],
          metrics: m.metrics || null,
        })),
        retrieval: {
          ...state.retrieval,
          query: null,
          chunks: lastAssistantWithChunks?.retrievedChunks || [],
          isLoading: false,
          error: null,
          messageId: latestId,
          // Only the latest message group is open
          expandedGroupMessageId: latestId,
          activeGroupMessageId: latestId,
        },
      }
    }

    case QA_ACTIONS.CLEAR_CHAT:
      return {
        ...state,
        messages: [],
        isStreaming: false,
        chatError: null,
        retrieval: {
          query: null,
          chunks: [],
          isLoading: false,
          error: null,
          messageId: null,
          expandedGroupMessageId: null,
          activeGroupMessageId: null,
        },
      }

    // ----------------------------------------------------
    // RETRIEVAL ACTIONS
    // ----------------------------------------------------
    case QA_ACTIONS.START_RETRIEVAL:
      return {
        ...state,
        retrieval: {
          ...state.retrieval,
          query: action.payload.query || null,
          isLoading: true,
          error: null,
          messageId: action.payload.messageId || null,
        },
      }

    case QA_ACTIONS.SET_RETRIEVAL_CHUNKS: {
      const targetMsgId = action.payload.messageId ?? state.retrieval.messageId
      const chunks = action.payload.chunks || []
      const query = action.payload.query ?? state.retrieval.query

      return {
        ...state,
        // Attach retrievedChunks & query to the specific message
        messages: state.messages.map((msg) =>
          msg.id === targetMsgId
            ? {
                ...msg,
                retrievedChunks: chunks,
                query: query,
              }
            : msg
        ),
        retrieval: {
          ...state.retrieval,
          query,
          chunks,
          isLoading: false,
          error: null,
          messageId: targetMsgId,
          // Exclusively open the new message group, closing all previous groups
          expandedGroupMessageId: targetMsgId,
          activeGroupMessageId: targetMsgId,
        },
      }
    }

    case QA_ACTIONS.SET_RETRIEVAL_ERROR:
      return {
        ...state,
        retrieval: {
          ...state.retrieval,
          isLoading: false,
          error: action.payload.error,
        },
      }

    case QA_ACTIONS.CLEAR_RETRIEVAL:
      return {
        ...state,
        retrieval: {
          query: null,
          chunks: [],
          isLoading: false,
          error: null,
          messageId: null,
          expandedGroupMessageId: null,
          activeGroupMessageId: null,
        },
      }

    case QA_ACTIONS.TOGGLE_RETRIEVAL_GROUP: {
      const msgId = action.payload.messageId
      const isCurrentlyExpanded = state.retrieval.expandedGroupMessageId === msgId
      return {
        ...state,
        retrieval: {
          ...state.retrieval,
          // If already open, close it; otherwise open ONLY this message group
          expandedGroupMessageId: isCurrentlyExpanded ? null : msgId,
          activeGroupMessageId: isCurrentlyExpanded ? null : msgId,
        },
      }
    }

    case QA_ACTIONS.FOCUS_RETRIEVAL_GROUP: {
      const msgId = action.payload.messageId
      return {
        ...state,
        retrieval: {
          ...state.retrieval,
          // Exclusively open ONLY this message group and close any other open group
          expandedGroupMessageId: msgId,
          activeGroupMessageId: msgId,
        },
      }
    }

    // ----------------------------------------------------
    // CONNECTION ACTIONS
    // ----------------------------------------------------
    case QA_ACTIONS.SET_CONNECTION_STATUS:
      return {
        ...state,
        isConnected: Boolean(action.payload),
      }

    default:
      return state
  }
}
