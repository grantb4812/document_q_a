# Experiment 01: Chunk Size & Overlap Boundary Stress Test

## 1. Objective & Hypothesis

**Question:** What breaks at the extremes of chunk size (200 tokens vs 2,000 tokens), and how does overlap mitigate boundary fractures?

- **Micro-Chunk Hypothesis (200 tokens):** Slices sentences, tables, and clauses into isolated fragments. Risks missing vital caveats located in subsequent paragraphs.
- **Macro-Chunk Hypothesis (2000 tokens):** Causes "vector dilution" by compressing multiple heterogeneous topics into one vector, resulting in lower precision on pinpoint lookups and $3\times–10\times$ prompt token inflation.

---

## 2. Benchmark Corpus & Setup

- **Corpus:** [`strategies/corpora/policy-operations.md`](../../corpora/policy-operations.md) (~1,439 BPE tokens).
- **Configurations Evaluated:**
  1. `EXP-200-0`: 200 tokens, 0 overlap
  2. `EXP-200-50`: 200 tokens, 50 overlap
  3. `EXP-500-50`: 500 tokens, 50 overlap (**Default Baseline**)
  4. `EXP-2000-0`: 2000 tokens, 0 overlap
  5. `EXP-2000-200`: 2000 tokens, 200 overlap

---

## 3. Empirical Results Matrix

| Configuration | Chunks Produced | Ingest Token Overhead | Ingest Cost | Top-3 Prompt Tokens | Prompt Cost / Query | Context Integrity Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`200 tokens / 0 ovlp`** | 8 chunks | 1,439 tokens (+0%) | $0.000029 | 439 tokens | $0.000066 | ⚠️ Low (Fragmented) |
| **`200 tokens / 50 ovlp`** | 10 chunks | 1,889 tokens (**+31%**) | $0.000038 | 489 tokens | $0.000073 | ⚠️ Medium-Low |
| **`500 tokens / 50 ovlp`** | **4 chunks** | **1,589 tokens (+10%)** | **$0.000032** | **1,089 tokens** | **$0.000163** | ⚖️ **Optimal Balance** |
| **`2000 tokens / 0 ovlp`** | 1 chunk | 1,439 tokens (+0%) | $0.000029 | 1,439 tokens | $0.000216 | ⚠️ Diluted / High Cost |
| **`2000 tokens / 200 ovlp`**| 1 chunk | 1,439 tokens (+0%) | $0.000029 | 1,439 tokens | $0.000216 | ⚠️ Diluted / High Cost |

---

## 4. Key Takeaways & Failure Modes

1. **200 Tokens (Micro):** Slices rules away from exceptions. A query about enterprise refunds retrieves the eligibility clause but omits non-refundable conditions in paragraph 2, leading the LLM to provide **unqualified, incorrect answers**.
2. **2000 Tokens (Macro):** Increases per-query prompt cost by $3.3\times$, slows TTFT due to prefill latency, and dilutes vector discrimination on needle-in-a-haystack codes like `BIO-SEC-9844-DELTA`.
3. **The Sweet Spot:** **`400 – 600 tokens` with `10% – 15% overlap` (`40–60 tokens`)** preserves paragraph structure and keeps prompt costs `<$0.00020` per query.

---

## 5. How to Re-Run This Experiment

```bash
node strategies/experiments/01-chunk-size-and-overlap/run.js
```
