import { CssBaseline, Box, ThemeProvider } from '@mui/material'
import theme from './theme'
import Header from './header/Header'
import Sources from './sources/Sources'
import Chat from './chat/Chat'
import Retrieval from './retrieval/Retrieval'

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
            px: 1.5,
            pb: 1.5,
            pt: 0.5,
            overflow: 'hidden',
          }}
        >
          {/* Left Panel: Sources */}
          <Box sx={{ width: { xs: 240, md: 280, lg: 300 }, height: '100%' }}>
            <Sources />
          </Box>

          {/* Center Panel: Chat */}
          <Box sx={{ flex: 1, height: '100%', minWidth: 0 }}>
            <Chat />
          </Box>

          {/* Right Panel: Studio */}
          <Box sx={{ width: { xs: 260, md: 320, lg: 360 }, height: '100%' }}>
            <Retrieval />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
