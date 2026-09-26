import { AppBar, Toolbar, Typography, Box, Avatar, Button } from '@mui/material'
import { ScienceOutlined } from '@mui/icons-material'

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

        {/* Right Side: Strategy Lab Link & User Initials */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ScienceOutlined sx={{ fontSize: '15px !important', color: 'primary.main' }} />}
            href="/lab"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              height: 30,
              px: 1.5,
              borderRadius: '6px',
              borderColor: 'divider',
              color: 'text.primary',
              bgcolor: 'background.paper',
              boxShadow: 'none',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Strategy Lab
          </Button>

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
