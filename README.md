# Document QA: RAG & Chunking Strategy

A high-level overview of the Retrieval-Augmented Generation (RAG) architecture, document chunking strategies, conversational multi-turn context handling, and token budget management used in this application.

> 📁 **Strategy Lab & Test Logs:** Detailed strategy blueprints, parameter trade-off matrices, and empirical test logs are documented in the [`strategies/`](./strategies/README.md) directory.

---

## 1. High-Level Architecture Overview

The system follows a modern, decoupled RAG pipeline that transforms raw documents into searchable vector representations, retrieves relevant context on demand, and streams grounded answers from a Large Language Model (LLM).

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   User Upload   │ ────> │  Text Extract   │ ────> │ Page-Aware BPE  │
│  (PDF/Txt/Doc)  │       │  & Normalizing  │       │  Token Chunking │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Real-Time Live  │ <──── │ OpenAI LLM      │ <──── │ Vector Search & │
│ SSE Streaming   │       │ (gpt-4o-mini)   │       │ Top-K Retrieval │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. Document Processing & Chunking Strategy

Rather than relying on naive character- or paragraph-based splitting, documents are chunked using a **Page-Aware, Tokenizer-Based Sliding Window** strategy.

### A. Page-Aware Boundary Isolation
- Multi-page documents (such as PDFs) are extracted on a **per-page basis**.
- Chunking processes each page independently so that chunks do not bleed across physical page boundaries.
- **Why it matters:** Citations (e.g., `[annual_report.pdf, Page 4]`) remain exact, deterministic, and verifiable.

### B. Model-Aligned Tokenizer (BPE)
- Text is converted directly into model token IDs using Byte-Pair Encoding (`cl100k_base`).
- **Why it matters:** Prevents arbitrary character splitters from slicing words, sentences, or multi-byte Unicode characters in half, ensuring chunk boundaries match the exact token space of the LLM.

### C. Sliding Window with Overlap
- When a document or page exceeds the target token limit, a sliding window steps through the token stream.
- **Step Size:** `Target Chunk Size - Overlap Tokens`.
- **Why Overlap is Critical:** Information that falls on the seam between two chunks is preserved. Overlapping tokens provide the semantic bridge needed to ensure facts are not cut off mid-thought or mid-sentence.

```
Token Stream:  [0 .................................................... 1400]
Chunk 1:       [0 -------------- 500]
Chunk 2:                    [450 -------------- 950]      <-- (50 token overlap)
Chunk 3:                                 [900 -------------- 1400]
```

### D. Document Processing Lineage
- Each document permanently stores its processing receipt (`chunkSize`, `overlap`, `chunkCount`).
- This allows evaluating the same document uploaded multiple times with different chunking granularities (e.g., 200 tokens vs. 800 tokens) side-by-side.

---

## 3. Retrieval & Vector Search Strategy

1. **Vector Embeddings:**
   - Every chunk is converted into a dense vector embedding using `text-embedding-3-small` (1,536 dimensions).
   - Indexed using fast cosine similarity search.

2. **Dynamic Top-K Retrieval:**
   - When a question is asked, the query is vectorized and compared against all indexed chunks in the database.
   - The top $N$ most similar chunks (configurable in the UI from 1 to 15) are retrieved, ranked by relevance score, and passed to the LLM.

---

## 4. Multi-Turn Conversation Strategy

LLMs are inherently stateless—they retain no memory between individual API requests. Multi-turn conversational memory is achieved through structured prompt orchestration.

### A. The Transcript Pattern
- With each new user question, recent conversation turns (User prompts and Assistant answers) are assembled into the message history.
- **Pronoun & Entity Resolution:** Because past turns are visible in the context, the model's self-attention mechanism seamlessly resolves pronouns like *"What about that one?"*, *"Can you explain that in more detail?"*, or *"Compare that with 2023"*.

### B. Current-Turn Context Injection
- **Past Turns:** Included as plain conversational text (`user` and `assistant` messages) because previous answers already synthesized and cited relevant facts.
- **Current Turn:** Injects the *newly retrieved document chunks* for the active question.
- **Why this matters:** Prevents "context dilution" and prompt bloat by avoiding redundant re-injection of old, raw text chunks from previous turns.

---

## 5. Token Budget & Sliding Window Pruning

To keep API calls fast, cost-effective, and safe from context overflow, conversations operate within a strict **Token Budget**.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOTAL CONTEXT BUDGET (e.g., 12,000 tokens)                             │
│                                                                        │
│ 1. System Prompt + Current Retrieved Chunks    (Dynamic: ~1,500-3,000) │
│ 2. Current User Question                       (Dynamic: ~50-200)      │
│ 3. Reserved Output Generation Space            (Fixed: 2,048 tokens)   │
│ 4. Remaining Budget for Conversation History   (Sliding Window)        │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Why We Reserve Output Tokens
Context window limits apply to the **sum of prompt input tokens + generated output tokens**. Reserving a fixed buffer (e.g., 2,048 tokens) guarantees the LLM always has room to write a complete, detailed answer without cutting off mid-sentence.

### B. Sliding History Window
- The system calculates remaining token capacity:
  $$\text{History Budget} = \text{Max Budget} - \text{System Tokens} - \text{Query Tokens} - \text{Reserved Output}$$
- It iterates backwards from the newest previous turn to older turns, retaining as much conversational context as fits within the budget while cleanly dropping older, out-of-budget turns.
