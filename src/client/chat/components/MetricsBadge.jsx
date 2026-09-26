import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Popover,
  Paper,
  Divider,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material'
import BoltIcon from '@mui/icons-material/Bolt'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TollIcon from '@mui/icons-material/Toll'
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'

export function MetricsBadge({ metrics }) {
  const [anchorEl, setAnchorEl] = useState(null)

  if (!metrics) return null

  const handleOpen = (event) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
  }

  const handleClose = (event) => {
    if (event) event.stopPropagation()
    setAnchorEl(null)
  }

  const open = Boolean(anchorEl)

  // Extract metrics values safely with fallbacks
  const ttft = metrics.clientTtftMs || metrics.ttftMs || 0
  const totalDuration = metrics.clientTotalDurationMs || metrics.totalDurationMs || 0
  const formattedDuration =
    totalDuration >= 1000 ? `${(totalDuration / 1000).toFixed(1)}s` : `${totalDuration}ms`
  const totalTokens = metrics.tokens?.total || (metrics.tokens?.prompt || 0) + (metrics.tokens?.completion || 0)
  const costFormatted = metrics.cost?.formatted || `$${(metrics.cost?.total || 0).toFixed(5)}`

  const serverPhases = metrics.serverPhases || {}
  const tokens = metrics.tokens || {}
  const cost = metrics.cost || {}

  return (
    <>
      <Tooltip title="Click to view full latency, token budget, and cost breakdown">
        <Chip
          size="small"
          icon={<BoltIcon sx={{ fontSize: '13px !important', color: 'warning.main' }} />}
          label={`${ttft}ms TTFT • ${formattedDuration} • ${totalTokens.toLocaleString()} toks • ${costFormatted}`}
          onClick={handleOpen}
          variant="outlined"
          sx={{
            height: 22,
            fontSize: '0.70rem',
            fontWeight: 500,
            cursor: 'pointer',
            bgcolor: open ? 'action.selected' : 'background.paper',
            borderColor: open ? 'warning.main' : 'divider',
            color: 'text.secondary',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'warning.light',
              color: 'text.primary',
            },
            ml: 0.5,
            mt: 0.2,
          }}
        />
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              p: 2,
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
              border: '1px solid',
              borderColor: 'divider',
              mt: 0.5,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
              Execution & Cost Receipt
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} sx={{ p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Stack spacing={1.5}>
          {/* 1. Latency Breakdown */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 14, color: 'info.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.75rem' }}>
                Latency & TTFT
              </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Client E2E TTFT:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                  {metrics.clientTtftMs ? `${metrics.clientTtftMs}ms` : `${metrics.ttftMs || 0}ms`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Total Duration:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                  {formattedDuration}
                </Typography>
              </Box>
              {serverPhases.embeddingMs !== undefined && (
                <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.68rem', mb: 0.2 }}>
                    Server Pipeline Breakdown:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'text.secondary' }}>
                    <span>• Query Embedding:</span>
                    <span>{serverPhases.embeddingMs}ms</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'text.secondary' }}>
                    <span>• Vector Search:</span>
                    <span>{serverPhases.vectorSearchMs}ms</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'text.secondary' }}>
                    <span>• Model Prefill (TTFT):</span>
                    <span>{serverPhases.prefillMs || 0}ms</span>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'text.secondary' }}>
                    <span>• Token Generation:</span>
                    <span>{serverPhases.generationMs || 0}ms</span>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>

          {/* 2. Token Budget Distribution */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <TollIcon sx={{ fontSize: 14, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.75rem' }}>
                Token Distribution
              </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Prompt Input (Context + History):
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                  {(tokens.prompt || 0).toLocaleString()} toks
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Assistant Completion:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                  {(tokens.completion || 0).toLocaleString()} toks
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                  Total Tokens:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.72rem' }}>
                  {totalTokens.toLocaleString()} toks
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* 3. Cost Breakdown */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <MonetizationOnOutlinedIcon sx={{ fontSize: 14, color: 'success.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.75rem' }}>
                Estimated Cost ({metrics.model || 'gpt-4o-mini'})
              </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', borderRadius: '8px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Prompt ($0.15/1M):
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                  ${(cost.prompt || 0).toFixed(6)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Completion ($0.60/1M):
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                  ${(cost.completion || 0).toFixed(6)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  Embedding ($0.02/1M):
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                  ${(cost.embedding || 0).toFixed(8)}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  Total Request Cost:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main', fontSize: '0.75rem' }}>
                  {costFormatted}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Stack>
      </Popover>
    </>
  )
}

export default MetricsBadge
