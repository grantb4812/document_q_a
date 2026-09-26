import { CHAT_ACTIONS } from '../constants/chatConstants'

export const initialChatState = {
  messages: [],
  isStreaming: false,
  error: null,
}

export function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.ADD_USER_MESSAGE:
      return {
        ...state,
        error: null,
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

    case CHAT_ACTIONS.START_ASSISTANT_MESSAGE: {
      const existing = state.messages.find((m) => m.id === action.payload.messageId)
      if (existing) {
        return {
          ...state,
          isStreaming: true,
          error: null,
        }
      }
      return {
        ...state,
        isStreaming: true,
        error: null,
        messages: [
          ...state.messages,
          {
            id: action.payload.messageId,
            role: 'assistant',
            content: '',
            status: 'streaming',
            timestamp: action.payload.timestamp || new Date().toISOString(),
          },
        ],
      }
    }

    case CHAT_ACTIONS.APPEND_ASSISTANT_CHUNK:
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.messageId
            ? {
                ...msg,
                content: msg.content + action.payload.chunk,
              }
            : msg
        ),
      }

    case CHAT_ACTIONS.FINISH_ASSISTANT_MESSAGE:
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.messageId
            ? {
                ...msg,
                status: 'complete',
                content: action.payload.fullText ?? msg.content,
              }
            : msg
        ),
      }

    case CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        isStreaming: false,
        error: action.payload.error,
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

    case CHAT_ACTIONS.SET_STREAMING:
      return {
        ...state,
        isStreaming: action.payload,
      }

    case CHAT_ACTIONS.CLEAR_CHAT:
      return {
        ...initialChatState,
      }

    default:
      return state
  }
}
