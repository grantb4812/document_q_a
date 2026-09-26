import { getAppSettings, updateAppSettings } from './settingsHelper.js'

export default async function (fastify, opts) {
  // 1. Get settings from SQLite
  fastify.get('/', async (request, reply) => {
    const currentSettings = getAppSettings()
    return {
      message: 'Settings retrieved successfully',
      settings: currentSettings,
    }
  })

  // 2. Update settings in SQLite
  fastify.patch('/', async (request, reply) => {
    const payload = request.body || {}
    const updated = updateAppSettings(payload)
    return {
      message: 'Settings updated successfully',
      settings: updated,
    }
  })

  // 3. Fallback POST
  fastify.post('/', async (request, reply) => {
    const payload = request.body || {}
    const updated = updateAppSettings(payload)
    return {
      message: 'Settings saved successfully',
      settings: updated,
    }
  })
}
