import { Box, Typography } from '@mui/material'
import FindInPageOutlinedIcon from '@mui/icons-material/FindInPageOutlined'

export function EmptyRetrieval() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <FindInPageOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
        No Context Retrieved Yet
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 260, color: 'text.secondary', fontSize: '0.82rem' }}>
        When you send a message, relevant chunks and citations found in your documents will appear here.
      </Typography>
    </Box>
  )
}

export default EmptyRetrieval
