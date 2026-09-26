import { useState } from 'react'
import { Box, Paper, Typography, Chip, Collapse, Stack } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined'
import ChunkCard from './ChunkCard'

export function MessageChunkGroup({
  message,
  turnIndex,
  isExpanded,
  isActive,
  onToggle,
}) {
  const [openChunkId, setOpenChunkId] = useState(null)

  const chunks = message.retrievedChunks || []
  const query = message.query || (message.content ? message.content.slice(0, 45) + '...' : null)

  const handleToggleChunk = (chunkKey) => {
    setOpenChunkId((prev) => (prev === chunkKey ? null : chunkKey))
  }

  return (
    <Paper
      id={`retrieval-group-${message.id}`}
      variant="outlined"
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        flexShrink: 0,
        borderColor: isActive ? 'primary.main' : 'divider',
        bgcolor: isActive ? 'rgba(26, 115, 232, 0.02)' : 'background.paper',
        boxShadow: isActive ? '0 0 0 2px rgba(26, 115, 232, 0.18)' : 'none',
        transition: 'all 0.25s ease-in-out',
      }}
    >
      {/* Accordion Header */}
      <Box
        onClick={onToggle}
        sx={{
          p: 1.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          bgcolor: isExpanded ? 'action.hover' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
          transition: 'background-color 0.15s ease',
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, mr: 1 }}>
          <QuestionAnswerOutlinedIcon
            sx={{
              fontSize: 16,
              color: isActive ? 'primary.main' : 'text.secondary',
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontWeight: 600,
                fontSize: '0.82rem',
                color: isActive ? 'primary.main' : 'text.primary',
              }}
            >
              Turn {turnIndex}: {query ? `"${query}"` : 'Retrieved Context'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Chip
            size="small"
            label={`${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`}
            sx={{
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: isActive ? 'primary.light' : 'action.selected',
              color: isActive ? 'primary.dark' : 'text.secondary',
              borderRadius: '6px',
            }}
          />
          {isExpanded ? (
            <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </Box>
      </Box>

      {/* Accordion Content */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit={false}>
        <Box sx={{ p: 1.5, pt: 1, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.25}>
            {chunks.map((chunk, index) => {
              const chunkKey = chunk.id ?? index
              const isThisChunkOpen = openChunkId === chunkKey

              return (
                <ChunkCard
                  key={chunk.id || `chunk-${message.id}-${index}`}
                  chunk={chunk}
                  index={index}
                  isExpanded={isThisChunkOpen}
                  onToggleExpand={() => handleToggleChunk(chunkKey)}
                />
              )
            })}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  )
}

export default MessageChunkGroup
