import { AppBar, Toolbar, Typography, Box, Avatar } from '@mui/material'

function Header({ initials = 'GB' }) {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        borderBottom: 'none',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          minHeight: '48px !important',
          height: 48,
          px: { xs: 1.5, sm: 2 },
        }}
      >
        {/* Left Side: Vite SVG Icon & App Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/favicon.svg"
            alt="Logo"
            sx={{ width: 24, height: 24 }}
          />
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '1.15rem',
              letterSpacing: '-0.2px',
            }}
          >
            Document Q&A
          </Typography>
        </Box>

        {/* Right Side: User Initials */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: '#137333',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header
