import { Box } from '@mui/material'
import QaProvider from './context/QaProvider'
import Chat from '../chat/Chat'
import Retrieval from '../retrieval/Retrieval'

function QaLayout() {
  return (
    <>
      {/* Center Panel: Chat */}
      <Box sx={{ flex: 1, height: '100%', minWidth: 0 }}>
        <Chat />
      </Box>

      {/* Right Panel: Retrieval Chunks & Sources */}
      <Box sx={{ width: { xs: 280, md: 340, lg: 380 }, height: '100%' }}>
        <Retrieval />
      </Box>
    </>
  )
}

export function QaContainer() {
  return (
    <QaProvider>
      <QaLayout />
    </QaProvider>
  )
}

export default QaContainer
