import {
  Paper,
  Box,
  Typography,
  IconButton,
  Button,
  InputBase,
  Stack,
} from '@mui/material'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

function Chat() {
  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2">
          Chat
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small">
            <TuneOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* Main Welcome Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: 580,
          mx: 'auto',
          width: '100%',
          px: 2,
        }}
      >
        <Box sx={{ fontSize: '2.5rem', mb: 2, lineHeight: 1 }}>👋</Box>

        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '1.75rem', md: '2.1rem' },
            color: 'text.primary',
            letterSpacing: '-0.5px',
            mb: 1.5,
          }}
        >
          Let's start your notebook...
        </Typography>

        <Typography
          variant="body1"
          sx={{ lineHeight: 1.6, mb: 4 }}
        >
          This is your blank canvas to understand, create, or make progress on something new. I can
          help you get started or you can go ahead and add your own sources.
        </Typography>

        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: 'text.primary', mb: 1.5 }}
        >
          What would you like this notebook to help you do?
        </Typography>

        <Stack spacing={1.5} sx={{ width: '100%' }}>
          <Button
            variant="outlined"
            color="inherit"
            sx={{
              justifyContent: 'flex-start',
              alignSelf: 'flex-start',
              borderColor: 'divider',
              px: 2.5,
              py: 0.8,
              '&:hover': {
                borderColor: 'divider',
                bgcolor: 'action.hover',
              },
            }}
          >
            Learn about a new topic
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            sx={{
              justifyContent: 'flex-start',
              alignSelf: 'flex-start',
              borderColor: 'divider',
              px: 2.5,
              py: 0.8,
              '&:hover': {
                borderColor: 'divider',
                bgcolor: 'action.hover',
              },
            }}
          >
            Create something new
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            sx={{
              justifyContent: 'flex-start',
              alignSelf: 'flex-start',
              borderColor: 'divider',
              px: 2.5,
              py: 0.8,
              '&:hover': {
                borderColor: 'divider',
                bgcolor: 'action.hover',
              },
            }}
          >
            Make progress on a project
          </Button>
        </Stack>
      </Box>

      {/* Bottom Chat Input Bar */}
      <Box sx={{ mt: 'auto', pt: 2, width: '100%' }}>
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
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <InputBase
            placeholder="Ask a question or create something"
            fullWidth
            sx={{
              fontSize: '0.95rem',
              color: 'text.primary',
              '& ::placeholder': {
                color: 'text.disabled',
                opacity: 1,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              mr: 1.5,
              whiteSpace: 'nowrap',
              fontSize: '0.8rem',
            }}
          >
            0 sources
          </Typography>
          <IconButton
            size="small"
            sx={{
              bgcolor: 'action.hover',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Gemini Disclaimer */}
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ mt: 1, fontSize: '0.75rem' }}
        >
          Gemini Notebook can be inaccurate; please double check its responses.
        </Typography>
      </Box>
    </Paper>
  )
}

export default Chat
