# Git Workflow & Commit Guidelines

This project follows a strict, atomic, and safe Git workflow to ensure reliability, easy rollbacks, and clear history.

## 1. Commit Cadence & Verification Gate
- **When to Commit**: Commit immediately after completing and verifying any cohesive unit of work (e.g., a feature, a refactor, a benchmark suite, or a bug fix).
- **Pre-Commit Verification**:
  1. Always run `npm run lint` and `npm run build` before committing.
  2. Inspect changes with `git status -s` and `git diff --stat` to ensure only intended files are staged.
  3. Ensure no local secrets (`.env`), temporary files, or SQLite binary artifacts (`qa.db*`) are tracked.

## 2. Commit Message Convention
Use conventional commits with clear scopes:
- `feat(scope)`: New capability, UI component, or API route.
- `refactor(scope)`: Code restructuring, schema improvements, or reorganizations without behavioral changes.
- `test(scope)` / `exp(scope)`: Benchmark suites, strategy experiments, or test runners.
- `fix(scope)`: Bug fixes or error resolution.
- `docs(scope)`: Documentation, architecture specs, or benchmark reports.
- `chore(scope)`: Config updates, dependency changes, or build script adjustments.

## 3. Branching Strategy
- **`main`**: The primary stable branch.
- **Short-lived Feature/Experiment Branches**:
  - `exp/<experiment-name>`: For isolated RAG experiments, chunking benchmarks, or retrieval evaluations.
  - `feat/<feature-name>`: For large multi-step architectural changes or integrations.
  - Fast-forward or merge cleanly back into `main` after verification.

## 4. Safety & Rollback Guardrails
- Never execute destructive reset commands (`git reset --hard`, `git clean -fd`) without explicit user intent and an existing stash/commit backup.
- When embarking on risky or multi-file refactoring, create a safe checkpoint (`git stash` or a WIP commit) before editing.
