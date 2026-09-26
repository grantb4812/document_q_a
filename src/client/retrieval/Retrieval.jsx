import { Paper, Box, Stack, Skeleton, Alert } from '@mui/material'
import { useQa } from '../qa/context/useQa'
import RetrievalHeader from './components/RetrievalHeader'
import MessageChunkGroup from './components/MessageChunkGroup'
import EmptyRetrieval from './components/EmptyRetrieval'

export function Retrieval() {
  const {
    messages,
    retrievalChunks,
    isRetrieving,
    retrievalQuery,
    clearRetrieval,
    retrievalError,
    expandedGroupMessageId,
    activeGroupMessageId,
    toggleRetrievalGroup,
  } = useQa()


  // Filter all assistant messages that have retrieved chunks
  const messagesWithChunks = (messages || []).filter(
    (m) => m.role === 'assistant' && m.retrievedChunks && m.retrievedChunks.length > 0
  )

  // Total count of chunks across all retrieved turns
  const totalChunksCount =
    messagesWithChunks.reduce((sum, m) => sum + (m.retrievedChunks?.length || 0), 0) ||
    retrievalChunks?.length ||
    0

  const hasAnyChunks = messagesWithChunks.length > 0 || (retrievalChunks && retrievalChunks.length > 0)

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: '24px',
        bgcolor: 'background.paper',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <RetrievalHeader
        chunkCount={totalChunksCount}
        isRetrieving={isRetrieving}
        onClear={clearRetrieval}
        query={retrievalQuery}
      />

      {/* Error alert if any */}
      {retrievalError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', flexShrink: 0 }}>
          {retrievalError}
        </Alert>
      )}

      {/* Loading state during retrieval */}
      {isRetrieving && !hasAnyChunks && (
        <Stack spacing={2} sx={{ flex: 1, py: 1 }}>
          <Skeleton variant="rounded" height={110} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rounded" height={130} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rounded" height={90} sx={{ borderRadius: '16px' }} />
        </Stack>
      )}

      {/* Empty State */}
      {!isRetrieving && !hasAnyChunks && <EmptyRetrieval />}

      {/* Scrollable List of Grouped Chunks */}
      {hasAnyChunks && (
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            pr: 0.5,
          }}
        >
          <Stack spacing={1.5} sx={{ pb: 2 }}>
            {messagesWithChunks.map((msg, idx) => (
              <MessageChunkGroup
                key={msg.id || `group-${idx}`}
                message={msg}
                turnIndex={idx + 1}
                isExpanded={expandedGroupMessageId === msg.id}
                isActive={activeGroupMessageId === msg.id}
                onToggle={() => toggleRetrievalGroup(msg.id)}
              />
            ))}

          </Stack>
        </Box>
      )}
    </Paper>
  )
}

export default Retrieval
