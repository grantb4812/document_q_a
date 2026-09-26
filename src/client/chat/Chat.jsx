import { Paper } from '@mui/material'
import ChatHeader from './components/ChatHeader'
import ChatMessageList from './components/ChatMessageList'
import ChatInput from './components/ChatInput'

function Chat() {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        borderRadius: '24px',
        bgcolor: 'background.paper',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* 1. Header with title, message count badge, and Clear Chat button */}
      <ChatHeader />

      {/* 2. Scrollable Message List */}
      <ChatMessageList />

      {/* 3. Chat Input Bar */}
      <ChatInput />
    </Paper>
  )
}

export default Chat

