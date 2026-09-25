import { useContext } from 'react'
import { SourcesContext } from './sourcesContextInstance'

export function useSources() {
  const context = useContext(SourcesContext)
  if (!context) {
    throw new Error('useSources must be used within a SourcesProvider')
  }
  return context
}

export default useSources
