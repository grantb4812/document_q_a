import { useReducer, useCallback, useEffect } from 'react'
import { ChatContext } from './chatContextInstance'
import { CHAT_ACTIONS } from '../constants/chatConstants'
import { chatReducer, initialChatState } from './chatReducer'
import { sendChatMessage } from '../services/chatService'

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)

  // Establish SSE connection for streaming chat responses
  useEffect(() => {
    const eventSource = new EventSource('api/chat/stream')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'start') {
          dispatch({
            type: CHAT_ACTIONS.START_ASSISTANT_MESSAGE,
            payload: { messageId: data.messageId, timestamp: data.timestamp },
          })
        } else if (data.type === 'chunk') {
          dispatch({
            type: CHAT_ACTIONS.APPEND_ASSISTANT_CHUNK,
            payload: { messageId: data.messageId, chunk: data.chunk },
          })
        } else if (data.type === 'done') {
          dispatch({
            type: CHAT_ACTIONS.FINISH_ASSISTANT_MESSAGE,
            payload: { messageId: data.messageId, fullText: data.fullText },
          })
        } else if (data.type === 'error') {
          dispatch({
            type: CHAT_ACTIONS.SET_ERROR,
            payload: { messageId: data.messageId, error: data.error },
          })
        }
      } catch (err) {
        console.error('[ChatContext] Failed to parse SSE event:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[ChatContext] EventSource error:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const handleSendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || state.isStreaming) return

    const trimmed = text.trim()
    const userMsgId = `user_${Date.now()}`

    dispatch({
      type: CHAT_ACTIONS.ADD_USER_MESSAGE,
      payload: { id: userMsgId, content: trimmed },
    })

    try {
      await sendChatMessage(trimmed)
    } catch (err) {
      console.error('[ChatContext] Send message failed:', err)
      dispatch({
        type: CHAT_ACTIONS.SET_ERROR,
        payload: { error: err.message },
      })
    }
  }, [state.isStreaming])

  const handleClearChat = useCallback(() => {
    dispatch({ type: CHAT_ACTIONS.CLEAR_CHAT })
  }, [])

  const value = {
    messages: state.messages,
    isStreaming: state.isStreaming,
    error: state.error,
    sendMessage: handleSendMessage,
    clearChat: handleClearChat,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export default ChatProvider
