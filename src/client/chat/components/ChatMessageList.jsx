import { useEffect, useRef } from 'react'
import { Box, Typography, Paper, Stack, Chip, Tooltip } from '@mui/material'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { useQa } from '../../qa/context/useQa'
import { MetricsBadge } from './MetricsBadge'

function ChatMessageList() {
  const { messages, selectMessageRetrieval, activeGroupMessageId } = useQa()
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <SmartToyOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          Document QA Chat
        </Typography>
        <Typography variant="body2" sx={{ maxWidth: 320, color: 'text.secondary', fontSize: '0.875rem' }}>
          Ask questions or explore your documents. Send a message to start streaming.
        </Typography>
      </Box>
    )
  }

  return (
    <Stack
      spacing={2}
      sx={{
        flex: 1,
        overflowY: 'auto',
        pr: 1,
        mb: 2,
      }}
    >
      {messages.map((message) => {
        const isUser = message.role === 'user'
        const isMsgStreaming = message.status === 'streaming'
        const hasChunks = message.retrievedChunks && message.retrievedChunks.length > 0
        const isFocused = activeGroupMessageId === message.id

        return (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              gap: 0.5,
            }}
          >
            {/* Role Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1,
              }}
            >
              {isUser ? (
                <>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    You
                  </Typography>
                  <PersonOutlineOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                </>
              ) : (
                <>
                  <SmartToyOutlinedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    Assistant
                  </Typography>
                </>
              )}
            </Box>

            {/* Message Bubble */}
            <Paper
              elevation={0}
              variant="outlined"
              onClick={!isUser && hasChunks ? () => selectMessageRetrieval(message.id) : undefined}
              sx={{
                p: 1.75,
                maxWidth: '85%',
                borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                bgcolor: isUser ? 'primary.main' : 'background.default',
                color: isUser ? 'primary.contrastText' : 'text.primary',
                borderColor: isUser
                  ? 'primary.main'
                  : isFocused
                  ? 'primary.main'
                  : 'divider',
                boxShadow: isFocused && !isUser ? '0 0 0 2px rgba(26, 115, 232, 0.2)' : 'none',
                wordBreak: 'break-word',
                cursor: !isUser && hasChunks ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': !isUser && hasChunks ? {
                  borderColor: 'primary.light',
                } : {},
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontSize: '0.9rem',
                }}
              >
                {message.content}
                {isMsgStreaming && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      width: 6,
                      height: 14,
                      ml: 0.5,
                      bgcolor: 'primary.main',
                      animation: 'pulse 1s infinite',
                      verticalAlign: 'middle',
                      borderRadius: '1px',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.2 },
                      },
                    }}
                  />
                )}
              </Typography>
            </Paper>

            {/* Metadata & Receipt Actions for Assistant Messages */}
            {!isUser && (hasChunks || message.metrics) && (
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, ml: 0.5, mt: 0.2 }}>
                {/* Context citation chip */}
                {hasChunks && (
                  <Tooltip title="Click to view and scroll to retrieved chunks in the right panel">
                    <Chip
                      size="small"
                      icon={<AutoAwesomeOutlinedIcon sx={{ fontSize: '13px !important', color: 'primary.main' }} />}
                      label={`${message.retrievedChunks.length} context chunk${message.retrievedChunks.length !== 1 ? 's' : ''}`}
                      onClick={() => selectMessageRetrieval(message.id)}
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        bgcolor: isFocused ? 'action.selected' : 'background.paper',
                        borderColor: isFocused ? 'primary.main' : 'divider',
                        color: 'text.primary',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          borderColor: 'primary.main',
                        },
                      }}
                    />
                  </Tooltip>
                )}

                {/* Performance & Cost Receipt */}
                {message.metrics && <MetricsBadge metrics={message.metrics} />}
              </Box>
            )}
          </Box>
        )
      })}
      <div ref={messagesEndRef} />
    </Stack>
  )
}

export default ChatMessageList
