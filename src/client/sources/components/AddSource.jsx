import { useState, useRef } from 'react'
import {
  Box,
  Button,
  IconButton,
  Popover,
  Typography,
  Slider,
  Stack,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TuneIcon from '@mui/icons-material/Tune'
import { useSources } from '../context/useSources'
import { useSettings } from '../../settings/context/useSettings'
import { FILE_ACCEPT_STRING } from '../constants/fileTypes'
import { isValidDocumentFile } from '../utils/fileValidation'

function AddSource() {
  const fileInputRef = useRef(null)
  const { uploadDocument } = useSources()
  const { chunkSize, overlap, setChunkSize, setOverlap } = useSettings()

  const [anchorEl, setAnchorEl] = useState(null)

  const handleOpenSettings = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleCloseSettings = () => {
    setAnchorEl(null)
  }

  const openSettings = Boolean(anchorEl)

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isValidDocumentFile(file)) {
      console.warn('[AddSource] Selected file type is not supported:', file.name)
      return
    }

    // Pass active chunkSize and overlap to document upload
    uploadDocument(file, { chunkSize, overlap })
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Hidden file input restricted to supported document types */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={FILE_ACCEPT_STRING}
        style={{ display: 'none' }}
      />

      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon />}
        onClick={handleButtonClick}
        sx={{
          py: 0.9,
          borderColor: 'divider',
          borderRadius: '24px',
          textTransform: 'none',
          fontWeight: 500,
          '&:hover': {
            borderColor: 'divider',
            bgcolor: 'action.hover',
          },
        }}
      >
        Add sources
      </Button>

      <Tooltip title="Chunking configuration">
        <IconButton
          size="small"
          onClick={handleOpenSettings}
          sx={{
            p: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '50%',
            color: openSettings ? 'primary.main' : 'text.secondary',
            bgcolor: openSettings ? 'action.selected' : 'transparent',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Chunking Settings Popover */}
      <Popover
        open={openSettings}
        anchorEl={anchorEl}
        onClose={handleCloseSettings}
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
              p: 2.5,
              width: 290,
              borderRadius: '18px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid',
              borderColor: 'divider',
              mt: 1,
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
          Document Chunking
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          Settings used when processing uploaded documents. Saved as default.
        </Typography>

        <Stack spacing={2.5}>
          {/* Chunk Size */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Chunk Size
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {chunkSize} tokens
              </Typography>
            </Box>
            <Slider
              size="small"
              value={chunkSize}
              min={100}
              max={2000}
              step={50}
              onChange={(_, val) => setChunkSize(val)}
              valueLabelDisplay="auto"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                100 (Fine)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                2000 (Broad)
              </Typography>
            </Box>
          </Box>

          {/* Overlap */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Chunk Overlap
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {overlap} tokens
              </Typography>
            </Box>
            <Slider
              size="small"
              value={overlap}
              min={0}
              max={Math.min(500, Math.floor(chunkSize / 2))}
              step={10}
              onChange={(_, val) => setOverlap(val)}
              valueLabelDisplay="auto"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                0 (No overlap)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                {Math.min(500, Math.floor(chunkSize / 2))} (Max)
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Popover>
    </Box>
  )
}

export default AddSource
