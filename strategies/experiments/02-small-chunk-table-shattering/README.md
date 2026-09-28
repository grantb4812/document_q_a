# Experiment 02: Small Chunk Fragmentation & Table Shattering

## 🎯 Objective
Empirically demonstrate how **micro-chunking (e.g. 80–100 tokens)** shatters multi-row structured Markdown tables, severing column headers from data rows and leaving queries with only the header row or isolated lower-tier fragments.

---

## 🔬 The Failure Mechanism

When chunking structured Markdown tables with a small token window:

```markdown
| Service Tier | Dedicated Bandwidth | VCPU / RAM Ceilings | Storage Allocation | Base Monthly Seat Rate | Support SLA Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier-1 Bronze** | 1.0 Gbps Burst | 16 vCPU / 64 GB | 2 TB NVMe SSD | $45 / user / mo | 8-hour email support |
| **Tier-2 Silver** | 5.0 Gbps Dedicated | 64 vCPU / 256 GB | 10 TB NVMe SSD | $85 / user / mo | 4-hour phone & ticket |
| **Tier-3 Platinum** | 25.0 Gbps Dedicated | 256 vCPU / 1,024 GB | 50 TB NVMe SSD | $175 / user / mo | 15-min dedicated Slack / PagerDuty |
| **Tier-4 Custom** | 100.0 Gbps Redundant | Custom Dedicated | Custom Scale-Out | Custom Negotiated | 24/7 Dedicated War Room |
```

1. **Chunk A (Header + Tier 1 only)**:
   * Contains table headers + Tier-1 Bronze.
   * Querying for *"all service tiers comparison table"* matches Chunk A because of table title keywords, but **completely misses Tiers 2, 3, and 4**.
2. **Chunk B (Orphaned Lower Rows)**:
   * Contains `| Tier-2 Silver ... |` and `| Tier-3 Platinum ... |`.
   * **Has NO column header row**. The LLM sees raw numbers without knowing which column is storage vs RAM vs bandwidth.
3. **Chunk C (Severed Tail-end Row)**:
   * Contains only `| Tier-4 Custom ... |`.

---

## 📊 Comparison Matrix

| Query Scenario | Micro-Chunking (`80t`) | Cohesive Chunking (`500t`) |
| :--- | :--- | :--- |
| **Full Table Request** (*"All 4 tiers comparison"*) | ❌ **Incomplete (25%)**: Retrieves Header + Tier 1 Bronze only. Model states Tiers 2–4 are missing. | ✅ **Complete (100%)**: Retrieves full 4-tier matrix with all 6 columns. |
| **Lower Row Query** (*"Tier-3 Platinum storage & rate"*) | ⚠️ **Header Severed**: Retrieves row without column headers; loses column alignment context. | ✅ **Context Preserved**: Row is positioned beneath explicit column headers. |
| **Tail-End Row** (*"Tier-4 Custom bandwidth & SLA"*) | ❌ **Severed Chunk**: Isolated single row fragment. | ✅ **Unified Context**: Full tier hierarchy maintained. |

---

## 🚀 How to Run the Benchmark

```bash
node strategies/experiments/02-small-chunk-table-shattering/run.js
```
