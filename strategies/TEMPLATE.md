# Strategy XX: [Strategy Name]

## 1. Overview & Core Hypothesis

- **Strategy Classification:** [e.g., Semantic Chunking / Parent-Child / Token Sliding Window]
- **Target Document Types:** [e.g., Markdown, PDFs, JSON, Legal Contracts]
- **Status:** [Draft / Under Test / Active / Deprecated]

### Core Hypothesis
*What problem does this strategy solve, and why should it perform better than naive splitting or prior strategies?*

---

## 2. Theoretical Mechanics & Data Flow

```
[Raw Document / Input Stream]
           │
           ▼
[Preprocessing / Parsing Stage]
           │
           ▼
[Chunk Boundary Detection Logic]
           │
           ▼
[Generated Chunks & Metadata (Tokens, Page/Section, Embeddings)]
```

### Detailed Mechanics
- **Splitting Criteria:** [e.g., Headers, Paragraph breaks, Token count thresholds, Embedding distance shifts]
- **Metadata Enriched:** [e.g., Page number, Section title, Parent chunk ID]
- **Overlap Strategy:** [e.g., Fixed token overlap, Sentence boundary overlap, None]

---

## 3. Parameter Space & Tuning Matrix

| Parameter | Recommended Default | Exploration Range | Impact & Trade-offs |
| :--- | :--- | :--- | :--- |
| **`chunkSize`** | `...` | `...` | ... |
| **`overlap`** | `...` | `...` | ... |
| **`topK`** | `...` | `...` | ... |

---

## 4. Strengths & Failure Modes

### Strengths
- [Key benefit 1]
- [Key benefit 2]

### Known Limitations & Edge Cases
- [Failure mode 1 - e.g. large tables sliced across chunks]
- [Failure mode 2 - e.g. noisy OCR text causing false split points]

---

## 5. Experimental Test Logs

Copy and paste this section for each test iteration run against this strategy:

### 🧪 Test Log #[ID]: [Document Name / Test Scenario]
- **Date:** YYYY-MM-DD
- **Test Corpus:** `document-name.pdf` (X pages, Y KB)
- **Configuration:**
  - `chunkSize`: `...`
  - `overlap`: `...`
  - `topK`: `...`
  - Model: `gpt-4o-mini`

#### Queries & Results
1. **Direct Fact Lookup:**
   - *Query:* "..."
   - *Retrieved Chunks:* [Rank 1 Score, Rank 2 Score...]
   - *Answer Quality:* [Accurate / Incomplete / Hallucinated]
2. **Boundary / Seam Test:**
   - *Query:* "..."
   - *Retrieved Chunks:* ...
   - *Answer Quality:* ...
3. **Multi-Turn Pronoun Follow-up:**
   - *Turn 1 Query:* "..."
   - *Turn 2 Query:* "What about that one?"
   - *Answer Quality:* ...

#### Observations & Next Iterations
- *What worked:* ...
- *What failed:* ...
- *Action items:* ...
