import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useQa } from '../../qa/context/useQa'

export function ChatHeader() {
  const { messages, isStreaming, clearChat } = useQa()
  const messageCount = messages?.length || 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
        pb: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      {/* Title & Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
          Chat
        </Typography>
        <Chip
          size="small"
          label={messageCount}
          color={messageCount > 0 ? 'primary' : 'default'}
          sx={{
            height: 20,
            fontSize: '0.72rem',
            fontWeight: 600,
            borderRadius: '10px',
          }}
        />
        {isStreaming && (
          <Chip
            size="small"
            label="Streaming..."
            color="primary"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 500,
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }}
          />
        )}
      </Box>

      {/* Clear Chat Action */}
      {messageCount > 0 && (
        <Tooltip title="Clear chat history">
          <span>
            <IconButton
              size="small"
              onClick={clearChat}
              disabled={isStreaming}
              sx={{
                color: 'text.secondary',
                p: 0.5,
                '&:hover': {
                  color: 'error.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  )
}

export default ChatHeader
