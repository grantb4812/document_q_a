export default async function (fastify, opts) {
  // 1. Get settings
  fastify.get('/settings', async (request, reply) => {
    return {
      message: 'Settings retrieved successfully',
      settings: {
        theme: 'light',
        notifications: true,
        model: 'gemini-1.5-pro',
      },
    }
  })

  // 2. Create settings
  fastify.post('/settings', async (request, reply) => {
    const payload = request.body || {}
    return {
      message: 'Settings created successfully',
      settings: payload,
    }
  })

  // 3. Update settings
  fastify.patch('/settings', async (request, reply) => {
    const payload = request.body || {}
    return {
      message: 'Settings updated successfully',
      settings: payload,
    }
  })
}
