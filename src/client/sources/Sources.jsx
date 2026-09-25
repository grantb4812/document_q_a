import { Paper } from '@mui/material'
import { SourcesProvider } from './context/SourcesProvider'
import AddSource from './components/AddSource'
import SourceDisplay from './components/SourceDisplay'

function SourcesContent() {
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
      {/* 1. Add Sources Button with file selector */}
      <AddSource />

      {/* 2. Display file name, loading indicator, and processing steps */}
      <SourceDisplay />
    </Paper>
  )
}

function Sources() {
  return (
    <SourcesProvider>
      <SourcesContent />
    </SourcesProvider>
  )
}

export default Sources
