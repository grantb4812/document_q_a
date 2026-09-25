import { ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES } from '../constants/fileTypes'

export function isValidDocumentFile(file) {
  if (!file) return false

  const name = file.name || ''
  const ext = '.' + name.split('.').pop().toLowerCase()

  const matchesExt = ALLOWED_FILE_EXTENSIONS.includes(ext)
  const matchesMime = Boolean(file.type && ALLOWED_MIME_TYPES.includes(file.type))

  return matchesExt || matchesMime
}
