import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
  Box,
} from '@mui/material'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import Settings from './Settings'

function Header() {
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 60, px: { xs: 1, sm: 2 } }}>
          {/* Left Side: Logo & App Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              }}
            >
              <Box
                component="img"
                src="/favicon.svg"
                alt="Logo"
                sx={{ width: 22, height: 22 }}
              />
            </Box>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 500,
                fontSize: '1.25rem',
                letterSpacing: '-0.2px',
              }}
            >
              Document Q&A
            </Typography>
          </Box>

          {/* Right Side: Settings */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="text"
              size="small"
              color="inherit"
              startIcon={<SettingsOutlinedIcon />}
              onClick={() => setOpenSettings(true)}
              sx={{
                px: 1.5,
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              Settings
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Settings open={openSettings} onClose={() => setOpenSettings(false)} />
    </>
  )
}

export default Header
