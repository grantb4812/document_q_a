export default async function (fastify, opts) {
  fastify.get('/v1/health', async (request, reply) => {
    return { message: 'This path evaluates to /api/v1/users' };
  });
}