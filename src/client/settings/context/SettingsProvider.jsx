import { useState, useEffect, useCallback } from 'react'
import { SettingsContext } from './settingsContextInstance'
import { fetchSettings, saveSettings } from '../services/settingsService'

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    chunkSize: 500,
    overlap: 50,
    topK: 5,
    model: 'gpt-4o-mini',
  })
  const [isLoading, setIsLoading] = useState(true)

  // 1. Fetch initial settings on app mount
  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const data = await fetchSettings()
        if (isMounted && data) {
          setSettings({
            chunkSize: data.chunkSize ?? 500,
            overlap: data.overlap ?? 50,
            topK: data.topK ?? 5,
            model: data.model ?? 'gpt-4o-mini',
          })
        }
      } catch (err) {
        console.warn('[SettingsProvider] Failed to load settings from server:', err.message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Update settings optimistically and persist to server
  const updateSettings = useCallback(async (partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      return next
    })

    try {
      await saveSettings(partial)
    } catch (err) {
      console.error('[SettingsProvider] Failed to persist settings to server:', err)
    }
  }, [])

  const setChunkSize = useCallback((chunkSize) => {
    updateSettings({ chunkSize: Number(chunkSize) })
  }, [updateSettings])

  const setOverlap = useCallback((overlap) => {
    updateSettings({ overlap: Number(overlap) })
  }, [updateSettings])

  const setTopK = useCallback((topK) => {
    updateSettings({ topK: Number(topK) })
  }, [updateSettings])

  const value = {
    settings,
    chunkSize: settings.chunkSize,
    overlap: settings.overlap,
    topK: settings.topK,
    model: settings.model,
    isLoading,
    updateSettings,
    setChunkSize,
    setOverlap,
    setTopK,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export default SettingsProvider
