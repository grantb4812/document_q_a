import { useState } from 'react'
import { Paper, InputBase, IconButton, CircularProgress } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useChat } from '../context/useChat'

function ChatInput() {
  const [inputText, setInputText] = useState('')
  const { sendMessage, isStreaming } = useChat()

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return
    sendMessage(inputText)
    setInputText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: '28px',
        borderColor: 'divider',
        pl: 2.5,
        pr: 1,
        py: 0.8,
        bgcolor: 'background.paper',
        '&:focus-within': {
          borderColor: 'primary.main',
        },
      }}
    >
      <InputBase
        placeholder="Ask a question or create something..."
        fullWidth
        multiline
        maxRows={4}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isStreaming}
        sx={{
          fontSize: '0.95rem',
          color: 'text.primary',
          '& ::placeholder': {
            color: 'text.disabled',
            opacity: 1,
          },
        }}
      />
      <IconButton
        size="small"
        onClick={handleSend}
        disabled={!inputText.trim() || isStreaming}
        sx={{
          bgcolor: inputText.trim() && !isStreaming ? 'primary.main' : 'action.hover',
          color: inputText.trim() && !isStreaming ? 'primary.contrastText' : 'text.secondary',
          '&:hover': {
            bgcolor: inputText.trim() && !isStreaming ? 'primary.dark' : 'action.selected',
          },
          '&.Mui-disabled': {
            bgcolor: 'action.disabledBackground',
            color: 'action.disabled',
          },
          transition: 'all 0.2s ease',
          ml: 1,
        }}
      >
        {isStreaming ? (
          <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
        ) : (
          <ArrowForwardIcon fontSize="small" />
        )}
      </IconButton>
    </Paper>
  )
}

export default ChatInput
