import { useContext } from 'react'
import { QaContext } from './qaContextInstance'

export function useQa() {
  const context = useContext(QaContext)
  if (!context) {
    throw new Error('useQa must be used within a QaProvider')
  }
  return context
}

export default useQa
