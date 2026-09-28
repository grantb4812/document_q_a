# Document QA: Strategy & Experimentation Lab

A dedicated research lab tracking document chunking architectures, retrieval strategies, standardized evaluation corpora, and empirical experiment suites for the Document QA platform.

---

## 📁 Repository Structure

```
strategies/
├── README.md                         <-- Master Lab Index & Evaluation Matrix
│
├── corpora/                          <-- Standardized Evaluation Datasets
│   └── policy-operations.md          <-- Multi-paragraph rules, caveats, compliance & tables
│
├── architectures/                    <-- Chunking & Retrieval Architectures
│   ├── 01-page-aware-sliding-window.md  <-- Default sliding window tokenizer
│   └── TEMPLATE.md                   <-- Strategy specification template
│
└── experiments/                      <-- Reusable Test Suites
    ├── 01-multi-turn-retrieval-breakage/  <-- Multi-turn conversational & token budget benchmark
    │   ├── README.md
    │   ├── run.js
    │   └── results/
    │
    ├── 02-small-chunk-table-shattering/   <-- Small chunk table slicing & header severance benchmark
    │   ├── README.md
    │   ├── run.js
    │   └── results/
    │
    └── 03-indirect-prompt-injection/      <-- Indirect document prompt injection & hijacking benchmark
        ├── README.md
        ├── run.js
        └── results/
```

---

## 🔬 Benchmark Experiment Index

| Experiment ID | Title | Core Question Tested | Key Finding / Winner | Documentation | Runner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EXP-01`** | **Multi-Turn Token Budget Starvation** | *How do greedy chunks evict conversation history?* | High K and large chunks consume the entire 12k budget, driving history to 0 tokens and dropping up to 83% of prior turns. | [Read Report](./experiments/01-multi-turn-retrieval-breakage/README.md) | `node strategies/experiments/01-multi-turn-retrieval-breakage/run.js` |
| **`EXP-02`** | **Small Chunk Table Shattering** | *What happens when micro-chunks slice structured tables?* | 80t chunks sever column headers from lower tier rows, causing the model to only see Tier 1 and refuse/miss Tiers 2–4. | [Read Report](./experiments/02-small-chunk-table-shattering/README.md) | `node strategies/experiments/02-small-chunk-table-shattering/run.js` |
| **`EXP-03`** | **Indirect Prompt Injection** | *Can document text hijack the assistant into saying "I'm a pirate, argh!"?* | Evaluates vulnerability of standard prompt interpolation vs XML isolation and anti-hijacking system guardrails. | [Read Report](./experiments/03-indirect-prompt-injection/README.md) | `node strategies/experiments/03-indirect-prompt-injection/run.js` |

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
└────────────────────────────────┴──────────────────────────┴────────────────────────────┘
```
