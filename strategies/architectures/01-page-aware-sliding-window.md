# Architecture 01: Page-Aware Tokenizer Sliding Window

## 1. Overview & Core Hypothesis

- **Classification:** Fixed-size Token Window with Overlap + Physical Page Boundary Isolation
- **Status:** Active Default Strategy in Application
- **Tokenizer:** Byte-Pair Encoding (`cl100k_base`)
- **Primary Use Case:** Unstructured multi-page documents (PDFs, Markdown, plain text) with verifiable page citations.

---

## 2. Theoretical Mechanics

```
Document (Multi-Page PDF / Markdown)
   │
   ├── Page 1 ──> [Tokens 0 .. 380]   ──> Fits in 1 chunk  ──> [Chunk 1 (Page 1)]
   │
   └── Page 2 ──> [Tokens 0 .. 1250]  ──> Slices with Overlap:
                                          ├── [0 .. 500]       ──> [Chunk 2 (Page 2)]
                                          ├── [450 .. 950]     ──> [Chunk 3 (Page 2)] (50 token overlap)
                                          └── [900 .. 1250]    ──> [Chunk 4 (Page 2)] (50 token overlap)
```

### Key Principles
1. **Page Boundary Isolation:** Chunks never cross physical page boundaries, ensuring 100% deterministic citations (`[Document, Page X]`).
2. **Tokenizer Alignment:** Boundaries are calculated in BPE token ID space rather than character offsets, preventing sliced Unicode characters or word fractures.
3. **Sliding Window Overlap:** Advances by `step = chunkSize - overlap` to maintain semantic bridges across chunk seams.

---

## 3. Parameter Tuning Space

| Parameter | Default | Tunable Range | Trade-offs |
| :--- | :--- | :--- | :--- |
| **`chunkSize`** | `500` tokens | `100` – `2,000` tokens | **Small (100–250):** Highly targeted vector matches, but shatters paragraphs.<br>**Large (800–2000):** Broad context, but causes vector dilution and prompt bloat. |
| **`overlap`** | `50` tokens | `0` – `500` tokens | **Low (0–20):** Fewer chunks, but risks severing facts.<br>**High (100–250):** Maximum semantic safety, but adds +30%+ storage overhead. |
| **`topK`** | `5` chunks | `1` – `25` chunks | Retrieval depth passed to LLM context window. |

---

## 4. Benchmark Evaluations & Cross-References

This architecture is evaluated across our standardized experiment suites:
- [Experiment 01: Chunk Size & Overlap Boundary Stress Test (200t vs 500t vs 2000t)](../experiments/01-chunk-size-and-overlap/README.md)
- [Experiment 02: Top-K Retrieval Depth (K=1 vs K=5 vs K=20)](../experiments/02-top-k-retrieval-depth/README.md)
