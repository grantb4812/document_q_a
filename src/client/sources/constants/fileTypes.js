export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.md', '.txt']

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/markdown',
  'text/plain',
]

export const FILE_ACCEPT_STRING = [
  ...ALLOWED_FILE_EXTENSIONS,
  ...ALLOWED_MIME_TYPES,
].join(',')
