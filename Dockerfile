FROM node:22-bookworm-slim

# Install system dependencies required for native node addons (better-sqlite3, sqlite-vec)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies inside the container image
COPY package*.json ./
RUN npm install

# Expose Vite dev server (5173) and Fastify API server (3000)
EXPOSE 5173 3000

# Default command runs both client and server concurrently
CMD ["npm", "run", "dev"]
