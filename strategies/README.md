# RAG Chunking & Retrieval Strategies

A dedicated repository of chunking methodologies, retrieval architectures, parameter tuning guides, and empirical test logs for the Document QA platform.

---

## 📚 Strategy Index

| # | Strategy Name | Document Types | Primary Advantage | Status | Documentation |
| :- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Page-Aware Tokenizer Sliding Window** | Multi-page PDFs, reports, general prose | Exact physical page citations, no cross-page bleeding, consistent token density | **Active (Default)** | [Strategy 01 Guide & Tests](./01-page-aware-sliding-window.md) |
| **02** | *Semantic & Header-Aware Splitting* | Structured Markdown, API docs, legal agreements | Preserves outline hierarchy (`#`, `##`) and cohesive sections | *Planned / Backlog* | [Template / Proposal](./TEMPLATE.md) |
| **03** | *Hierarchical Parent-Child Chunking* | Large manuals, books, complex domain corpora | Small chunks for precise search + large parent chunks for LLM context | *Planned / Backlog* | [Template / Proposal](./TEMPLATE.md) |
| **04** | *Contextual / Metadata-Enriched Chunking* | Fragmented tables, FAQ lists, scanned OCR | Prepend document title and section headers to each chunk vector | *Planned / Backlog* | [Template / Proposal](./TEMPLATE.md) |

---

## 🧪 Testing & Evaluation Framework

When testing a new chunking or retrieval strategy, we evaluate against 5 empirical dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RAG EVALUATION MATRIX                           │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. Retrieval Precision   │ Are the Top-K chunks relevant to the query? │
│ 2. Boundary Integrity    │ Did chunking slice vital facts mid-sentence?│
│ 3. Citation Fidelity     │ Is the page/section citation 100% accurate? │
│ 4. Multi-Turn Coherence  │ Can pronouns resolve against chat history?  │
│ 5. Efficiency & Latency  │ Token consumption vs. Time to First Token   │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Evaluation Rubric

1. **Retrieval Precision & Recall (@ Top-K)**:
   - Does vector search retrieve the true answer-bearing chunk in the top $K$ results?
   - Are irrelevant or noisy chunks pulling down synthesis quality?
2. **Chunk Boundary Integrity & Overlap**:
   - Does overlap prevent semantic fractures when tables, code, or definitions land on chunk seams?
3. **Citation & Source Pinpointing**:
   - Does the citation `[Document, Page N]` allow the user to jump directly to the exact location in the original document?
4. **Conversational Multi-Turn Resolution**:
   - When users ask follow-up questions with pronouns (*"What did they say about that?"*, *"Compare it with prior years"*), does the context retrieval + message history produce the right answer?
5. **Token Economy**:
   - Prompt token footprint vs. information density provided to the model.

---

## 📝 How to Log Experiments & Tests

Every time we run a new benchmark or experiment:
1. Open or create the strategy document (e.g. [`01-page-aware-sliding-window.md`](./01-page-aware-sliding-window.md) or use [`TEMPLATE.md`](./TEMPLATE.md) for a new strategy).
2. Append a new test entry under the **Experimental Test Log** section with:
   - **Test Date & Document Spec** (file size, format, page count)
   - **Config Parameters** (`chunkSize`, `overlap`, `topK`, model)
   - **Sample Queries Tested** (single-hop, multi-hop, pronoun follow-ups)
   - **Observed Behavior** (hit rate, hallucination check, seam artifacts)
   - **Takeaways & Recommended Adjustments**
