
import { CssBaseline, Box, ThemeProvider } from '@mui/material'
import theme from './theme'
import Header from './components/Header'
import Sources from './components/Sources'
import Chat from './components/Chat'
import Studio from './components/Studio'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Header />

        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            overflow: 'hidden',
          }}
        >
          {/* Left Panel: Sources */}
          <Box sx={{ width: { xs: '100%', md: '280px', lg: '300px' }, height: '100%' }}>
            <Sources />
          </Box>

          {/* Center Panel: Chat */}
          <Box sx={{ flex: 1, height: '100%', minWidth: 0 }}>
            <Chat />
          </Box>

          {/* Right Panel: Studio */}
          <Box sx={{ width: { xs: '100%', md: '320px', lg: '360px' }, height: '100%' }}>
            <Studio />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App

