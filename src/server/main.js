import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

// 1. Define API routes first so they take precedence
fastify.get("/api/v1/health", async (request, reply) => {
  return { status: "ok 1" };
});

// 2. Register @fastify/static for asset files (js, css, images)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "../dist"), // Path to your SPA build folder
  prefix: "/",
  wildcard: false, // Prevents the static plugin from responding to non-existent file requests
});

// 3. SPA Catch-All Route: Serves index.html for all other GET requests
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
