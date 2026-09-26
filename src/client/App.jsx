import { CssBaseline, Box, ThemeProvider } from '@mui/material'
import theme from './theme'
import Header from './header/Header'
import Sources from './sources/Sources'
import QaContainer from './qa/QaContainer'
import { SettingsProvider } from './settings/context/SettingsProvider'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsProvider>
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

            {/* Combined Chat & Retrieval Container */}
            <QaContainer />
          </Box>
        </Box>
      </SettingsProvider>
    </ThemeProvider>
  )
}


export default App
