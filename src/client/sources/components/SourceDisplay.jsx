import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  LinearProgress,
  IconButton,
  Button,
  Tooltip,
} from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { useSources } from '../context/useSources'
import { PROCESSING_STEPS } from '../constants/sourcesConstants'
import { getFileIcon } from '../utils/fileIcons'

function SourceDisplay() {
  const { sources, isLoading, error, deleteDocument, deleteAllDocuments } = useSources()

  if (isLoading && (!sources || sources.length === 0)) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, gap: 1 }}>
        <CircularProgress size={18} thickness={5} sx={{ color: 'primary.main' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Loading documents...
        </Typography>
      </Box>
    )
  }

  if (error && (!sources || sources.length === 0)) {
    return (
      <Typography variant="caption" sx={{ color: 'error.main', mt: 2, textAlign: 'center' }}>
        Failed to load documents
      </Typography>
    )
  }

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header with count and Delete All */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Sources ({sources.length})
        </Typography>
        <Button
          size="small"
          color="error"
          onClick={deleteAllDocuments}
          sx={{
            textTransform: 'none',
            fontSize: '0.75rem',
            p: 0,
            minWidth: 'auto',
            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
          }}
        >
          Clear all
        </Button>
      </Box>

      <Stack spacing={1.5} sx={{ overflowY: 'auto', flex: 1, pr: 0.5 }}>
        {sources.map((source) => {
          const isProcessing = source.status === 'processing'
          const isComplete = source.status === 'complete'
          const isError = source.status === 'error'

          const stepProgress = Math.round(
            (((source.stepIndex ?? 0) + 1) / PROCESSING_STEPS.length) * 100
          )

          return (
            <Paper
              key={source.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: '16px',
                borderColor: isComplete ? 'divider' : 'primary.light',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {/* File info row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getFileIcon(source.name)}
                </Box>

                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontWeight: 500,
                    fontSize: '0.85rem',
                    color: 'text.primary',
                    flex: 1,
                  }}
                  title={source.name}
                >
                  {source.name}
                </Typography>

                {/* Status indicator */}
                {isProcessing && (
                  <CircularProgress size={14} thickness={5} sx={{ color: 'primary.main' }} />
                )}
                {isComplete && (
                  <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#137333' }} />
                )}
                {isError && (
                  <ErrorOutlinedIcon sx={{ fontSize: 18, color: 'error.main' }} />
                )}

                {/* Single document delete button */}
                <Tooltip title="Delete document">
                  <IconButton
                    size="small"
                    onClick={() => deleteDocument(source.id)}
                    sx={{
                      p: 0.3,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'error.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Processing step & progress bar */}
              {isProcessing && (
                <Box sx={{ mt: 0.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.6,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'primary.main',
                        fontWeight: 500,
                      }}
                    >
                      {source.currentStep}...
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.72rem', color: 'text.disabled' }}
                    >
                      Step {(source.stepIndex ?? 0) + 1} of {PROCESSING_STEPS.length}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stepProgress}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>
              )}

              {/* Complete state label */}
              {isComplete && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.75rem', color: '#137333', fontWeight: 500 }}
                >
                  Processing complete
                </Typography>
              )}

              {/* Error state */}
              {isError && (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.75rem', color: 'error.main' }}
                >
                  {source.error || 'Upload failed'}
                </Typography>
              )}
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}

export default SourceDisplay
