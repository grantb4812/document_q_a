import { Paper, InputBase, IconButton } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

function Chat() {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        p: 2.5,
        borderRadius: '24px',
        bgcolor: 'background.paper',
      }}
    >
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
    </Paper>
  )
}

export default Chat
