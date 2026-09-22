import path from "path";
import { fileURLToPath } from "url";

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import autoLoad from "@fastify/autoload";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

//api
fastify.register(autoLoad, {
  dir: path.join(__dirname, 'routes'),
  options: { prefix: '/api' } 
});

//client
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../../dist"),
  prefix: "/",
  wildcard: false, 
});

fastify.get("/*", async (request, reply) => {
  return reply.sendFile("index.html");
});
// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
