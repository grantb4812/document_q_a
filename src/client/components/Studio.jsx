import { Paper } from '@mui/material'

function Studio() {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: '24px',
        bgcolor: 'background.paper',
        p: 2.5,
      }}
    />
  )
}

export default Studio
