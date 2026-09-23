import { Paper, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

function Sources() {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        p: 2.5,
        borderRadius: '24px',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<AddIcon />}
        sx={{
          py: 1,
          borderColor: 'divider',
          borderRadius: '24px',
          '&:hover': {
            borderColor: 'divider',
            bgcolor: 'action.hover',
          },
        }}
      >
        Add sources
      </Button>
    </Paper>
  )
}

export default Sources
