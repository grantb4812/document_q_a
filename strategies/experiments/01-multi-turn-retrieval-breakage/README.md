# Experiment 01: Multi-Turn RAG Breakage & Token Budget Greediness

## 🎯 Objective
Empirically demonstrate how **retrieval chunk settings (`chunkSize` and `topK`) can greedily consume the fixed prompt token budget**, mathematically starving the conversation history buffer and causing silent **conversational memory loss** on multi-turn dialogue.

---

## ⚙️ The Architectural Flaw: The History Starvation Formula

In our server implementation (`src/server/routes/chat/route.js`):

```js
const systemTokens = countTokens(systemPrompt) // Includes all Top-K retrieved chunks
const remainingHistoryBudget = Math.max(
  0,
  MAX_PROMPT_BUDGET - systemTokens - userTokens - RESERVED_OUTPUT_TOKENS
)

const history = getRecentMessagesWithTokenBudget(
  conversationId,
  remainingHistoryBudget,
  userMsgId
)
```

### The Mathematical Point of Collapse:
With:
* `MAX_PROMPT_BUDGET` = $12,000$ tokens
* `RESERVED_OUTPUT_TOKENS` = $2,048$ tokens
* `userTokens` = $\approx 50$ tokens

$$\text{Remaining History Budget} = 12,000 - \text{systemTokens} - 2,048 - 50 = 9,902 - \text{systemTokens}$$

| Setting Combination | Total Retrieved Chunks Token Volume | Remaining History Budget | Retained Past Dialogue Turns | Conversational Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Greedy** (`1200t` $\times$ `Top-10`) | **$\approx 10,200$ tokens** | **$0$ tokens** | **$0$ turns** | 💥 **Total Amnesia**: Drops 100% of user history. Cannot answer follow-ups. |
| **Aggressive Drop** (`800t` $\times$ `Top-6`) | **$\approx 5,000$ tokens** | **$\approx 4,900$ tokens** | **$\approx 1$ turn** | ⚠️ **Partial Amnesia**: Drops turns 1–2 immediately upon turn 3. |
| **Balanced / Protected** (`400t` $\times$ `Top-3`) | **$\approx 1,200$ tokens** | **$\approx 8,700$ tokens** | **$10+$ turns** | ✅ **Full Memory**: Preserves entire conversational transcript. |

---

## 🧪 Sequential Dialogue Test Suite

We test a 4-turn sequential dialogue where each step builds upon prior context:

1. **Turn 1 (Anchor)**: *"What is the base monthly seat rate for the Tier-3 Platinum plan?"*
2. **Turn 2 (Coreference)**: *"What is the storage allocation and dedicated bandwidth for that same plan?"*
3. **Turn 3 (Synthesis)**: *"If our company has 50 users on it, what is our total base monthly expenditure?"* (Requires remembering the $175 rate from Turn 1 to compute $50 \times 175 = \$8,750$).
4. **Turn 4 (Full Summary)**: *"Can you summarize all 3 specs and our calculated monthly total from our discussion?"* (Requires full 3-turn memory).

---

## 🚀 How to Run the Benchmark

```bash
node strategies/experiments/01-multi-turn-retrieval-breakage/run.js
```
