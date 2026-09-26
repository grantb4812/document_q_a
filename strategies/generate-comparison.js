import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSideBySideComparison } from './lib/comparison-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const reportsDir = path.join(__dirname, 'reports')

export function generateHtmlReport(data) {
  const jsonString = JSON.stringify(data).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RAG Strategy Lab • Side-by-Side Chunking & Retrieval Diff</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --bg-surface: #101626;
      --bg-card: #151d30;
      --bg-card-hover: #1b253d;
      --border: #232f48;
      --border-focus: #3b82f6;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.12);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.12);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.12);
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }

    header {
      max-width: 1560px;
      margin: 0 auto 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    .title-group { display: flex; align-items: center; gap: 12px; }
    .lab-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 6px;
    }
    h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { color: var(--text-muted); font-size: 0.88rem; margin-top: 2px; }

    .header-actions { display: flex; gap: 10px; align-items: center; }
    .action-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: all 0.2s;
    }
    .action-btn:hover { background: var(--bg-card); border-color: var(--primary); color: #fff; }
    .action-btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .action-btn.primary:hover { background: #2563eb; }

    .main-layout {
      max-width: 1560px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Summary Bar */
    .overview-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
      position: relative;
      overflow: hidden;
    }
    .metric-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-val { font-size: 1.4rem; font-weight: 700; margin-top: 4px; font-family: var(--font-mono); }
    .metric-sub { font-size: 0.78rem; color: var(--text-dim); margin-top: 2px; }

    /* Question Navigator Tabs */
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .q-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .q-tab {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .q-tab:hover { background: var(--bg-card); color: var(--text); }
    .q-tab.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 0 16px var(--primary-glow);
    }

    /* Active Question Banner */
    .question-banner {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary);
      border-radius: 10px;
      padding: 18px 24px;
    }
    .q-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .q-text { font-size: 1.15rem; font-weight: 600; color: #fff; }
    .target-facts-box {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }
    .target-fact-pill {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #93c5fd;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      padding: 3px 10px;
      border-radius: 6px;
    }

    /* Comparison Grid (Side-by-Side Columns) */
    .comparison-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 1200px) {
      .comparison-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .comparison-grid { grid-template-columns: 1fr; }
    }

    .config-col {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .config-col:hover { border-color: rgba(59, 130, 246, 0.4); }

    .col-header {
      padding: 16px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .col-title { font-weight: 700; font-size: 0.95rem; }
    .col-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      background: var(--border);
      color: var(--text-muted);
    }
    .col-badge.baseline { background: var(--primary); color: #fff; }

    .verdict-banner {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      font-weight: 700;
      border-bottom: 1px solid var(--border);
    }
    .verdict-banner.PASS { background: var(--success-bg); color: var(--success); }
    .verdict-banner.PARTIAL { background: var(--warning-bg); color: var(--warning); }
    .verdict-banner.FAIL { background: var(--danger-bg); color: var(--danger); }

    .telemetry-strip {
      padding: 12px 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid var(--border);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }
    .t-item { display: flex; flex-direction: column; }
    .t-label { color: var(--text-dim); font-size: 0.68rem; text-transform: uppercase; }
    .t-val { color: #fff; font-weight: 600; }

    .answer-block {
      padding: 18px 16px;
      flex: 1;
      font-size: 0.88rem;
      line-height: 1.6;
      color: #e2e8f0;
      white-space: pre-wrap;
      border-bottom: 1px solid var(--border);
    }
    .citation-tag {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .retrieved-chunks-section {
      padding: 14px 16px;
      background: var(--bg-card);
    }
    .chunks-header {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .chunk-item {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 0.78rem;
    }
    .chunk-meta {
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      margin-bottom: 6px;
    }
    .chunk-score { color: var(--success); font-weight: 600; }
    .chunk-snippet {
      color: #cbd5e1;
      line-height: 1.4;
      max-height: 80px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 0.74rem;
      padding: 4px;
      background: rgba(0,0,0,0.25);
      border-radius: 4px;
    }

    .stage-btn {
      margin: 12px 16px;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .stage-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="title-group">
        <span class="lab-badge">Strategy Lab</span>
        <h1>Side-by-Side Chunking & Retrieval Diff</h1>
      </div>
      <p class="subtitle">Evaluates 100t vs 200t vs 500t vs 2000t chunk sizes on identical queries</p>
    </div>
    <div class="header-actions">
      <button class="action-btn" onclick="window.location.reload()">🔄 Refresh Lab</button>
      <a href="/" target="_blank" class="action-btn primary">🚀 Open Main Document QA App</a>
    </div>
  </header>

  <div class="main-layout">
    <!-- Top Summary Strip -->
    <div class="overview-strip" id="overview-strip"></div>

    <!-- Question Selector Tabs -->
    <div>
      <div class="section-title"><span>❓</span> Select Benchmark Evaluation Query</div>
      <div class="q-tabs" id="q-tabs"></div>
    </div>

    <!-- Active Question Detail -->
    <div class="question-banner" id="question-banner"></div>

    <!-- Side-by-Side Comparison Grid -->
    <div class="comparison-grid" id="comparison-grid"></div>
  </div>

  <script>
    const DATA = ${jsonString};
    let activeQuestionIndex = 0;

    function renderOverview() {
      const container = document.getElementById('overview-strip');
      const configs = DATA.configs || [];
      
      container.innerHTML = configs.map(c => \`
        <div class="metric-card">
          <div class="metric-label">\${c.label}</div>
          <div class="metric-val">\${c.chunkCount} <span style="font-size:0.9rem; font-weight:400; color:var(--text-muted)">chunks</span></div>
          <div class="metric-sub">\${c.totalTokens.toLocaleString()} tokens • $\${c.embeddingCost.toFixed(5)} ingest cost</div>
        </div>
      \`).join('');
    }

    function renderTabs() {
      const container = document.getElementById('q-tabs');
      container.innerHTML = DATA.questions.map((q, i) => \`
        <button class="q-tab \${i === activeQuestionIndex ? 'active' : ''}" onclick="selectQuestion(\${i})">
          \${i + 1}. \${q.title}
        </button>
      \`).join('');
    }

    function renderActiveQuestion() {
      const q = DATA.questions[activeQuestionIndex];
      const banner = document.getElementById('question-banner');
      banner.innerHTML = \`
        <span class="q-badge">Query \${activeQuestionIndex + 1} of \${DATA.questions.length} • \${q.title}</span>
        <div class="q-text">"\${q.query}"</div>
        <div class="target-facts-box">
          <strong style="color:var(--text-muted)">Target Ground Truth:</strong>
          \${q.targetFacts.map(f => \`<span class="target-fact-pill">\${f}</span>\`).join('')}
        </div>
      \`;

      renderGrid();
    }

    function renderGrid() {
      const q = DATA.questions[activeQuestionIndex];
      const grid = document.getElementById('comparison-grid');

      grid.innerHTML = q.comparisons.map((c, idx) => {
        const isBaseline = c.chunkSize === 500;
        const v = c.groundTruth.verdict;
        const formattedAnswer = c.answer
          .replace(/\\[Chunk #?(\\d+)\\]/g, '<span class="citation-tag">[Chunk $1]</span>')
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

        return \`
          <div class="config-col">
            <div class="col-header">
              <span class="col-title">\${c.configLabel}</span>
              <span class="col-badge \${isBaseline ? 'baseline' : ''}">\${isBaseline ? 'Baseline' : c.chunkSize + 't'}</span>
            </div>

            <div class="verdict-banner \${v}">
              <span>Verdict: \${v} (\${c.groundTruth.recallPercentage}% Recall)</span>
              <span>\${c.groundTruth.factsFound.length}/\${q.targetFacts.length} facts</span>
            </div>

            <div class="telemetry-strip">
              <div class="t-item">
                <span class="t-label">TTFT</span>
                <span class="t-val">\${c.telemetry.ttftMs}ms</span>
              </div>
              <div class="t-item">
                <span class="t-label">Total Latency</span>
                <span class="t-val">\${c.telemetry.totalDurationMs}ms</span>
              </div>
              <div class="t-item">
                <span class="t-label">Tokens</span>
                <span class="t-val">\${c.telemetry.totalTokens} (\${c.telemetry.promptTokens} in / \${c.telemetry.completionTokens} out)</span>
              </div>
              <div class="t-item">
                <span class="t-label">Cost</span>
                <span class="t-val">\${c.telemetry.costFormatted}</span>
              </div>
            </div>

            <div class="answer-block">\${formattedAnswer}</div>

            <div class="retrieved-chunks-section">
              <div class="chunks-header">
                <span>Retrieved Context Chunks</span>
                <span>Top \${c.retrievedChunks.length}</span>
              </div>
              \${c.retrievedChunks.map(chk => \`
                <div class="chunk-item">
                  <div class="chunk-meta">
                    <span>Chunk #\${chk.chunkNum} (\${chk.tokenCount}t)</span>
                    <span class="chunk-score">Sim: \${(chk.score * 100).toFixed(1)}%</span>
                  </div>
                  <div class="chunk-snippet">\${chk.text.slice(0, 180)}...</div>
                </div>
              \`).join('')}
            </div>

            <button class="stage-btn" onclick="stageConfig(\${c.chunkSize}, \${c.overlap})">
              🚀 Stage \${c.chunkSize}t/\${c.overlap}ov to Live DB
            </button>
          </div>
        \`;
      }).join('');
    }

    function selectQuestion(idx) {
      activeQuestionIndex = idx;
      renderTabs();
      renderActiveQuestion();
    }

    async function stageConfig(chunkSize, overlap) {
      try {
        const res = await fetch(\`/api/lab/stage?chunkSize=\${chunkSize}&overlap=\${overlap}\`, { method: 'POST' });
        const resData = await res.json();
        alert(\`✅ Live Database staged with \${chunkSize}t chunk size! You can now switch to the main UI tab to test.\`);
      } catch (err) {
        alert('Staged request sent! Check your main app.');
      }
    }

    renderOverview();
    renderTabs();
    renderActiveQuestion();
  </script>
</body>
</html>`
}

async function main() {
  console.log('='.repeat(80))
  console.log('🔬 GENERATING FULL SIDE-BY-SIDE STRATEGY COMPARISON DATASET')
  console.log('='.repeat(80))

  const results = await runSideBySideComparison({ topK: 5 })

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })

  const jsonPath = path.join(dataDir, 'comparison-results.json')
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2))
  console.log(`✓ Stored comparison dataset: ${jsonPath}`)

  const htmlContent = generateHtmlReport(results)
  const htmlPath = path.join(reportsDir, 'chunk-comparison.html')
  fs.writeFileSync(htmlPath, htmlContent)
  console.log(`✓ Generated standalone HTML report: ${htmlPath}`)

  console.log('='.repeat(80))
  console.log('✨ All comparison data ready!')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(console.error)
}
