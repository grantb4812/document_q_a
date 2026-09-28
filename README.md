# Document QA

An intelligent, full-stack Document Q&A platform featuring token-aware sliding window chunking, vector embeddings with SQLite-vec, real-time Server-Sent Events (SSE) streaming, and an empirical strategy evaluation lab.

---

## 🚀 Getting Started

Choose your preferred development environment:

### Option 1: Local Host Machine

Run directly on your local machine using Node.js:

```bash
# Install dependencies
npm install

# Start frontend and backend concurrently
npm run dev
```

* Open **[http://localhost:5173](http://localhost:5173)** to access the web application.

---

### Option 2: Docker Compose

Run the entire application in a container without installing packages on your host machine:

```bash
# Start container in foreground
npm run docker:dev

# Or start container in the background
docker compose up -d

# Stop container
npm run docker:down
```

* **Frontend**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:3000](http://localhost:3000)

---

### Option 3: VS Code Dev Containers

Develop directly inside the container with full IntelliSense, autocomplete, and type definitions:

1. Open the project in **Visual Studio Code** or **Cursor**.
2. Press **`Cmd + Shift + P`** (macOS) or **`Ctrl + Shift + P`** (Windows/Linux).
3. Select **`Dev Containers: Reopen in Container`**.
4. Open the integrated terminal (`Ctrl + ~`) and start the dev server:
   ```bash
   npm run dev
   ```

---

## 🔬 Strategy & Experimentation Lab

For in-depth RAG benchmarks, multi-turn conversational token budget evaluations, and prompt injection resilience tests, see the [Strategy Lab Documentation](./strategies/README.md).

```bash
# Stage any benchmark experiment into the database:
npm run strategy:stage -- 01  # Multi-Turn Token Budget Starvation
npm run strategy:stage -- 02  # Small Chunk Table Shattering
npm run strategy:stage -- 03  # Indirect Prompt Injection (Pirate Directive)
```
