import users from './users.js'
import settings from './settings.js'
import documents from './documents.js'
import chunks from './chunks.js'
import messages from './messages.js'

export default function init() {
  users()
  settings()
  documents()
  chunks()
  messages()
}

init()

