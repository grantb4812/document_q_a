import { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import { useSettings } from '../../settings/context/useSettings'

const TOP_K_OPTIONS = [1, 3, 5, 8, 10, 15]

export function RetrievalHeader({ chunkCount = 0, isRetrieving = false, onClear, query }) {
  const { topK, setTopK } = useSettings()
  const [anchorEl, setAnchorEl] = useState(null)

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseMenu = () => {
    setAnchorEl(null)
  }

  const handleSelectTopK = (value) => {
    setTopK(value)
    handleCloseMenu()
  }

  return (
    <Box sx={{ mb: 2 }}>
      {/* Top Row: Title, Badge, Top-K Selector, Clear Action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
            Retrieved Context
          </Typography>
          <Chip
            size="small"
            label={chunkCount}
            color={chunkCount > 0 ? 'primary' : 'default'}
            sx={{
              height: 20,
              fontSize: '0.72rem',
              fontWeight: 600,
              borderRadius: '10px',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Top-K Selector Chip / Button */}
          <Tooltip title="Configure number of retrieved chunks (N chunks)">
            <Chip
              size="small"
              icon={<TuneIcon sx={{ fontSize: '13px !important' }} />}
              label={`Top ${topK}`}
              onClick={handleOpenMenu}
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.72rem',
                fontWeight: 600,
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: anchorEl ? 'action.selected' : 'transparent',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.light',
                },
              }}
            />
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: '12px',
                  minWidth: 140,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  mt: 0.5,
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Chunks Retrieved
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.68rem' }}>
                Saved as default
              </Typography>
            </Box>
            {TOP_K_OPTIONS.map((num) => (
              <MenuItem
                key={num}
                selected={num === topK}
                onClick={() => handleSelectTopK(num)}
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: num === topK ? 600 : 400,
                  py: 0.6,
                }}
              >
                Top {num} chunks {num === topK && '✓'}
              </MenuItem>
            ))}
          </Menu>

          {chunkCount > 0 && onClear && (
            <Tooltip title="Clear retrieved context">
              <IconButton size="small" onClick={onClear} sx={{ color: 'text.secondary', p: 0.5 }}>
                <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Subtitle / Query pill */}
      {query ? (
        <Typography
          variant="caption"
          noWrap
          sx={{
            display: 'block',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontStyle: 'italic',
          }}
        >
          For query: &ldquo;{query}&rdquo;
        </Typography>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
          Document chunks cited by the assistant (retrieving up to {topK} chunks)
        </Typography>
      )}
    </Box>
  )
}

export default RetrievalHeader
