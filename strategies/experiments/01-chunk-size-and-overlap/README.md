# Experiment 01: Chunk Size & Overlap Boundary Stress Test

## 1. Objective & Hypothesis

**Question:** What breaks at the extremes of chunk size (200 tokens vs 2,000 tokens), and how does overlap mitigate boundary fractures?

- **Micro-Chunk Hypothesis (200 tokens):** Slices sentences, tables, and clauses into isolated fragments. Risks missing vital caveats located in subsequent paragraphs.
- **Macro-Chunk Hypothesis (2000 tokens):** Causes "vector dilution" by compressing multiple heterogeneous topics into one vector, resulting in lower precision on pinpoint lookups and $3\times–10\times$ prompt token inflation.

---

## 2. Benchmark Corpus & Setup

- **Corpus:** [`strategies/corpora/policy-operations.md`](../../corpora/policy-operations.md) (~1,439 BPE tokens).
- **Configurations Evaluated:**
  1. `EXP-200-PURE`: 200 tokens, 0 overlap (Pure Micro-Chunking)
  2. `EXP-500-BASELINE`: 500 tokens, 50 overlap (Balanced Reference)
  3. `EXP-2000-PURE`: 2000 tokens, 0 overlap (Pure Macro-Chunking / Monolithic)

---

## 3. Empirical Results Matrix

| Configuration | Chunks Produced | Ingest Tokens | Ingest Cost | Prompt Tokens / Query | Query Cost | Context Integrity & Breakage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`200 tokens (Pure)`** | 8 chunks | 1,439 tokens | $0.000029 | 439 tokens | $0.000066 | ❌ **Fractures Tables & Slices Exception Clauses** |
| **`500 tokens (Baseline)`** | **4 chunks** | **1,589 tokens** | **$0.000032** | **1,089 tokens** | **$0.000163** | ⚖️ **Optimal Balance (Whole Sections Intact)** |
| **`2000 tokens (Pure)`** | 1 chunk | 1,439 tokens | $0.000029 | 1,439 tokens | $0.000216 | ⚠️ **Vector Dilution & High Prompt Latency** |

---

## 4. What Breaks at Each Extreme (No Assumptions)

### 🔴 What Breaks at 200 Tokens (Micro-Chunks):
1. **Markdown Tables Fracture:** The 4-tier pricing and bandwidth table spans ~180 tokens. At 200t, the table headers and lower rows get chopped into separate chunks, causing queries about Tier-3 Platinum or cross-region overage to retrieve incomplete fragments.
2. **Exception Clauses are Severed from Base Rules:** In Section 1 and Section 2, the baseline rule (e.g. 99.99% uptime) is separated from the 3 disqualifying conditions. The LLM retrieves the rule without the caveat and gives **confidently incomplete answers**.

### 🟡 What Breaks at 2000 Tokens (Macro-Chunks):
1. **Needle-in-a-Haystack Vector Dilution:** The entire 1,439-token document fits in a single chunk. Embedding 1,439 tokens into a single 1536-d vector averages out distinct technical keywords (`BIO-SEC-9844-DELTA`), lowering cosine similarity discrimination.
2. **Context Window Inflation & Slower TTFT:** Every single query must feed the entire document into the prompt, driving up input tokens by $3.3\times$ and increasing server prefill latency.

---

## 5. How to Re-Run This Experiment

```bash
node strategies/experiments/01-chunk-size-and-overlap/run.js
```
