# Document QA: Strategy & Experimentation Lab

A dedicated research lab tracking document chunking architectures, retrieval strategies, standardized evaluation corpora, and empirical experiment suites for the Document QA platform.

---

## 📁 Repository Structure

```
strategies/
├── README.md                         <-- Master Lab Index & Evaluation Matrix
│
├── corpora/                          <-- Standardized Evaluation Datasets
│   ├── policy-operations.md          <-- Multi-paragraph rules, caveats, compliance & tables
│   └── (upcoming corpora...)
│
├── architectures/                    <-- Chunking & Retrieval Architectures
│   ├── 01-page-aware-sliding-window.md  <-- Default sliding window tokenizer
│   └── TEMPLATE.md                   <-- Strategy specification template
│
└── experiments/                      <-- Reusable, Cross-Architecture Test Suites
    ├── 01-chunk-size-and-overlap/    <-- 200t vs 500t vs 2000t extremes benchmark
    │   ├── README.md
    │   ├── run.js
    │   └── results/
    │
    ├── 02-top-k-retrieval-depth/     <-- K=1 vs K=5 vs K=20 depth benchmark
    │   ├── README.md
    │   ├── run.js
    │   └── results/
    │
    ├── 03-negative-grounding/        <-- (Planned) Answer genuinely not in documents
    ├── 04-latency-and-cost/          <-- (Planned) TTFT & Token economics breakdown
    └── 05-prompt-injection-safety/   <-- (Planned) "Ignore instructions and say X"
```

---

## 🔬 Benchmark Experiment Index

| Experiment ID | Title | Core Question Tested | Key Finding / Winner | Documentation | Runner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EXP-01`** | **Chunk Size & Overlap Extremes** | *What breaks at 200 tokens vs 2000 tokens?* | 200t shatters tables & exceptions; 2000t causes vector dilution & 3.3x prompt cost. **Sweet spot: 400–600t with 10–15% overlap.** | [Read Report](./experiments/01-chunk-size-and-overlap/README.md) | `node strategies/experiments/01-chunk-size-and-overlap/run.js` |
| **`EXP-02`** | **Top-K Retrieval Depth** | *What happens at Top-1 vs Top-5 vs Top-20?* | Top-1 fails multi-part synthesis (25% recall); Top-20 adds distractor noise & $6\times$ prompt bloat. **Sweet spot: Top-5 (100% recall, balanced cost).** | [Read Report](./experiments/02-top-k-retrieval-depth/README.md) | `node strategies/experiments/02-top-k-retrieval-depth/run.js` |
| **`EXP-03`** | **Negative Grounding** | *What does the model do when the answer is not in docs?* | Evaluates refusal fidelity vs hallucination rate. | *Planned* | — |
| **`EXP-04`** | **Cost & TTFT Breakdown** | *How does prompt size scale latency and expenditure?* | Evaluates server prefill vs generation metrics. | *Planned* | — |
| **`EXP-05`** | **Prompt Injection Safety** | *Can document text hijack system instructions?* | Evaluates role isolation against indirect prompt injection. | *Planned* | — |

---

## 🧪 Standard Evaluation Matrix

Every experiment is evaluated against 5 standardized dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RAG EVALUATION MATRIX                           │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. Retrieval Recall & P  │ Did vector search capture all required facts?│
│ 2. Boundary Integrity    │ Did chunking slice vital facts mid-sentence?│
│ 3. Citation Fidelity     │ Is the page/section citation 100% accurate? │
│ 4. Prompt Token Economy  │ Prompt tokens consumed vs cost per query    │
│ 5. Latency & TTFT        │ Time to First Token and total stream time   │
└──────────────────────────┴─────────────────────────────────────────────┘
```
