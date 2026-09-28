# Document QA

## 🚀 Getting Started

create a .env file at the root of the project with:

```
OPENAI_API_KEY=your-openai-api-key
```

Choose your preferred development environment:

### Option 1: Local Host Machine

Run directly on your local machine using Node.js:

```bash
# Install dependencies
npm install

# Start frontend and backend concurrently
npm run dev
```

- Open **[http://localhost:5173](http://localhost:5173)** to access the web application.

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

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

### Option 3: VS Code Dev Containers

Develop directly inside the container with full IntelliSense, autocomplete

1. Open the project in **Visual Studio Code** or **Cursor**.
2. Press **`Cmd + Shift + P`** (macOS) or **`Ctrl + Shift + P`** (Windows/Linux).
3. Select **`Dev Containers: Reopen in Container`**.

---

## 🔬 Experimentation Lab

To seed the db with examples of known failure points, run:

```bash
# Stage any benchmark experiment into the database:
# cmd dependant on if running locally or with docker
npm run strategy:stage -- 01  # Multi-Turn Token Budget Starvation
npm run docker:stage -- 01
   # demonstrates the limitation of the current sliding window in multi turn conversation.
   # If the returned chunks consume all of the budget of the context window whether due to
   # excessive chunk size or returned N chunks we lose history of users question,
   # removing the ability to respond appropriately if the user uses pronouns refering to
   # past responses
npm run strategy:stage -- 02  # Small Chunk Table Shattering
npm run docker:stage -- 02
   # demonstrates how when using small chuncks based on only token count with little or no
   # offset we can lose the surrounding context needed for accurate responses. One example
   # would be chunking a table header but losing the context of the data multi points
   # of data in the table itself.
npm run strategy:stage -- 03 # Indirect Prompt Injection (Pirate Directive)
npm run docker:stage -- 03
   # demonstrates how data can be injected into documents and without proper mitigation
   # techniques in the the system prompt we can change the expected behavior
```
