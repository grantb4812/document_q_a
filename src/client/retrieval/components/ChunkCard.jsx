import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

export function ChunkCard({ chunk, index, isExpanded, onToggleExpand }) {
  const [copied, setCopied] = useState(false)
  const [internalExpanded, setInternalExpanded] = useState(false)

  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand()
    } else {
      setInternalExpanded(!internalExpanded)
    }
  }

  const handleCopy = (e) => {
    e.stopPropagation()
    if (chunk?.text) {
      navigator.clipboard.writeText(chunk.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const score = chunk.score !== undefined ? Math.round(chunk.score * 100) : null
  const isLongText = chunk.text && chunk.text.length > 220

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'background.default',
        borderColor: expanded ? 'primary.main' : 'divider',
        boxShadow: expanded ? '0 2px 10px rgba(26, 115, 232, 0.08)' : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
      }}
    >
      {/* Header: Document Info + Relevance Score */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, mr: 1 }}>
          <DescriptionOutlinedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '0.85rem',
            }}
            title={chunk.documentName || `Document #${chunk.documentId || index + 1}`}
          >
            {chunk.documentName || `Document #${chunk.documentId || index + 1}`}
          </Typography>
        </Box>

        {score !== null && (
          <Chip
            size="small"
            label={`${score}% match`}
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 600,
              bgcolor: score > 75 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(26, 115, 232, 0.1)',
              color: score > 75 ? '#2e7d32' : 'primary.main',
              borderRadius: '8px',
            }}
          />
        )}
      </Box>

      {/* Meta tags (Page, Chunk Index, Token count) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25, flexWrap: 'wrap' }}>
        {chunk.page && (
          <Chip
            label={`Page ${chunk.page}`}
            size="small"
            variant="outlined"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              borderRadius: '6px',
              color: 'text.secondary',
              borderColor: 'divider',
            }}
          />
        )}
        <Chip
          label={`Chunk #${chunk.chunkIndex !== undefined ? chunk.chunkIndex + 1 : index + 1}`}
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            borderRadius: '6px',
            color: 'text.secondary',
            borderColor: 'divider',
          }}
        />
        {chunk.tokenCount && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
            {chunk.tokenCount} tokens
          </Typography>
        )}
      </Box>

      {/* Chunk Content Preview / Full */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          maxHeight: expanded ? 320 : 'none',
          overflowY: expanded ? 'auto' : 'visible',
          transition: 'max-height 0.2s ease',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.82rem',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {isLongText && !expanded ? `${chunk.text.slice(0, 220)}...` : chunk.text}
        </Typography>
      </Box>

      {/* Card Actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isLongText ? 'space-between' : 'flex-end',
          mt: 1,
          pt: 0.5,
        }}
      >
        {isLongText && (
          <Box
            onClick={handleToggle}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' },
              userSelect: 'none',
            }}
          >
            {expanded ? 'Show less' : 'Read full chunk'}
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 16, ml: 0.25 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.25 }} />
            )}
          </Box>
        )}

        <Tooltip title={copied ? 'Copied!' : 'Copy chunk text'}>
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.5, color: 'text.secondary' }}>
            {copied ? (
              <CheckOutlinedIcon sx={{ fontSize: 15, color: 'success.main' }} />
            ) : (
              <ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  )
}

export default ChunkCard
