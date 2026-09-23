export default async function (fastify, opts) {
  // 1. Get documents
  fastify.get('/documents', async (request, reply) => {
    return {
      message: 'Documents retrieved successfully',
      documents: [
        {
          id: '1',
          title: 'Document 1',
          content: 'Content 1',
        },
      ],
    }
  })

  // 2. Create document
  fastify.post('/documents', async (request, reply) => {
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
