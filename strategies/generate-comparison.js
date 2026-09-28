import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAllExperiments } from './lib/comparison-runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const reportsDir = path.join(__dirname, 'reports')

export function generateHtmlReport(bundleData) {
  // Support both multi-experiment bundle and single experiment data
  const normalizedData = bundleData.experiments ? bundleData : { experiments: [bundleData] }
  const jsonString = JSON.stringify(normalizedData).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RAG Strategy Lab • Interactive Strategy Comparison</title>
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
      margin: 0 auto 20px;
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

    /* Experiment Switcher Tabs */
    .exp-switch-bar {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .exp-btn {
      flex: 1;
      min-width: 280px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text-muted);
    }
    .exp-btn:hover {
      background: var(--bg-card);
      color: var(--text);
    }
    .exp-btn.active {
      background: var(--bg-card);
      border-color: var(--primary);
      color: #fff;
      box-shadow: 0 0 16px var(--primary-glow);
    }
    .exp-title { font-weight: 700; font-size: 0.95rem; color: #fff; display: flex; align-items: center; gap: 8px; }
    .exp-desc { font-size: 0.78rem; color: var(--text-dim); margin-top: 4px; }

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
    .metric-val { font-size: 1.35rem; font-weight: 700; margin-top: 4px; font-family: var(--font-mono); }
    .metric-sub { font-size: 0.78rem; color: var(--text-dim); margin-top: 2px; }

    /* Question Navigator Tabs */
    .section-title {
      font-size: 1.05rem;
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
    .col-title { font-weight: 700; font-size: 0.92rem; }
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
    .verdict-banner.PASS, .verdict-banner.RESISTED_SAFE { background: var(--success-bg); color: var(--success); }
    .verdict-banner.PARTIAL, .verdict-banner.REFUSED_PARTIAL { background: var(--warning-bg); color: var(--warning); }
    .verdict-banner.FAIL, .verdict-banner.INJECTION_SUCCEEDED { background: var(--danger-bg); color: var(--danger); }

    .attack-payload-pill {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

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
        <h1>RAG Strategy & Evaluation Lab</h1>
      </div>
      <p class="subtitle" id="lab-subtitle">Interactive side-by-side answer, retrieval & telemetry comparison</p>
    </div>
    <div class="header-actions">
      <button class="action-btn" onclick="window.location.reload()">🔄 Refresh Lab</button>
      <a href="/" target="_blank" class="action-btn primary">🚀 Open Main Document QA App</a>
    </div>
  </header>

  <div class="main-layout">
    <!-- Top-Level Experiment Selector -->
    <div>
      <div class="section-title"><span>🔬</span> Select Strategy Experiment</div>
      <div class="exp-switch-bar" id="exp-switch-bar"></div>
    </div>

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
    const BUNDLE = ${jsonString};
    let activeExpIndex = 0;
    let activeQuestionIndex = 0;

    function renderExpSelector() {
      const container = document.getElementById('exp-switch-bar');
      container.innerHTML = BUNDLE.experiments.map((exp, i) => {
        const icon = i === 0 ? '📏' : i === 1 ? '🎯' : '🛡️';
        return \`
          <div class="exp-btn \${i === activeExpIndex ? 'active' : ''}" onclick="selectExperiment(\${i})">
            <div class="exp-title">
              <span>\${icon}</span>
              \${exp.shortName || exp.name}
            </div>
            <div class="exp-desc">\${exp.description}</div>
          </div>
        \`;
      }).join('');
    }

    function renderOverview() {
      const exp = BUNDLE.experiments[activeExpIndex];
      document.getElementById('lab-subtitle').textContent = exp.description;
      const container = document.getElementById('overview-strip');
      const configs = exp.configs || [];
      
      container.innerHTML = configs.map(c => \`
        <div class="metric-card">
          <div class="metric-label">\${c.label}</div>
          <div class="metric-val">\${c.badge || (c.chunkCount ? c.chunkCount + ' chunks' : 'Active')}</div>
          <div class="metric-sub">\${c.strategy || (c.topK ? 'Depth: K=' + c.topK : (c.totalTokens ? c.totalTokens.toLocaleString() + ' tokens' : ''))}</div>
        </div>
      \`).join('');
    }

    function renderTabs() {
      const exp = BUNDLE.experiments[activeExpIndex];
      const container = document.getElementById('q-tabs');
      container.innerHTML = exp.questions.map((q, i) => \`
        <button class="q-tab \${i === activeQuestionIndex ? 'active' : ''}" onclick="selectQuestion(\${i})">
          \${i + 1}. \${q.title}
        </button>
      \`).join('');
    }

    function renderActiveQuestion() {
      const exp = BUNDLE.experiments[activeExpIndex];
      const q = exp.questions[activeQuestionIndex];
      if (!q) return;

      const banner = document.getElementById('question-banner');
      const attackInfo = q.injectedPayload ? \`
        <div style="margin-top:8px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <strong style="color:var(--danger); font-size:0.8rem;">🚨 Injected Attack Payload in Document:</strong>
          <span class="attack-payload-pill">\${q.injectedPayload}</span>
          \${q.attackType ? \`<span style="font-size:0.75rem; color:var(--text-dim);">(\${q.attackType})</span>\` : ''}
        </div>
      \` : '';

      banner.innerHTML = \`
        <span class="q-badge">Query \${activeQuestionIndex + 1} of \${exp.questions.length} • \${q.title}</span>
        <div class="q-text">"\${q.query}"</div>
        <div class="target-facts-box">
          <strong style="color:var(--text-muted)">Target Legitimate Facts:</strong>
          \${q.targetFacts.map(f => \`<span class="target-fact-pill">\${f}</span>\`).join('')}
        </div>
        \${attackInfo}
      \`;

      renderGrid();
    }

    function renderGrid() {
      const exp = BUNDLE.experiments[activeExpIndex];
      const q = exp.questions[activeQuestionIndex];
      if (!q) return;

      const grid = document.getElementById('comparison-grid');

      grid.innerHTML = q.comparisons.map((c) => {
        const isBaseline = c.badge === 'Baseline' || c.badge === 'Vulnerable Baseline' || c.topK === 5 || c.chunkSize === 500;
        const v = c.groundTruth.verdict || 'PASS';
        const formattedAnswer = c.answer
          .replace(/\\[Chunk #?(\\d+)\\]/g, '<span class="citation-tag">[Chunk $1]</span>')
          .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

        const verdictText = c.groundTruth.attackResisted !== undefined
          ? (c.groundTruth.attackResisted 
              ? \`🛡️ Resisted Attack (\${c.groundTruth.recallPercentage}% Recall)\` 
              : \`🚨 Injection Succeeded\`)
          : \`Verdict: \${v} (\${c.groundTruth.recallPercentage}% Recall)\`;

        const verdictSub = c.groundTruth.attackResisted !== undefined
          ? (c.groundTruth.attackResisted ? \`\${c.groundTruth.factsFound.length}/\${q.targetFacts.length} facts retrieved\` : \`Adopted malicious payload\`)
          : \`\${c.groundTruth.factsFound.length}/\${q.targetFacts.length} facts\`;

        return \`
          <div class="config-col">
            <div class="col-header">
              <span class="col-title">\${c.configLabel}</span>
              <span class="col-badge \${isBaseline ? 'baseline' : ''}">\${c.badge || (isBaseline ? 'Baseline' : '')}</span>
            </div>

            <div class="verdict-banner \${v}">
              <span>\${verdictText}</span>
              <span>\${verdictSub}</span>
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

            <button class="stage-btn" onclick="stageConfig('\${exp.id}', \${c.chunkSize || 500}, \${c.overlap || 50}, \${c.topK || 5})">
              🚀 Stage to Live DB
            </button>
          </div>
        \`;
      }).join('');
    }

    function selectExperiment(idx) {
      activeExpIndex = idx;
      activeQuestionIndex = 0;
      renderExpSelector();
      renderOverview();
      renderTabs();
      renderActiveQuestion();
    }

    function selectQuestion(idx) {
      activeQuestionIndex = idx;
      renderTabs();
      renderActiveQuestion();
    }

    async function stageConfig(expId, chunkSize, overlap, topK) {
      try {
        const res = await fetch(\`/api/lab/stage?expId=\${expId}&chunkSize=\${chunkSize}&overlap=\${overlap}&topK=\${topK}\`, { method: 'POST' });
        const resData = await res.json();
        alert(\`✅ \${resData.message || 'Staged to active database!'}\\n\\nYou can now switch to the main chat tab to talk to this corpus live.\`);
      } catch (err) {
        alert('Staged request sent! Check your main app.');
      }
    }

    renderExpSelector();
    renderOverview();
    renderTabs();
    renderActiveQuestion();
  </script>
</body>
</html>`
}

async function main() {
  console.log('='.repeat(80))
  console.log('🔬 GENERATING FULL MULTI-EXPERIMENT STRATEGY LAB DATASET')
  console.log('='.repeat(80))

  const bundle = await runAllExperiments()

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })

  const jsonPath = path.join(dataDir, 'lab-experiments.json')
  fs.writeFileSync(jsonPath, JSON.stringify(bundle, null, 2))
  console.log(`✓ Stored multi-experiment dataset: ${jsonPath}`)

  const htmlContent = generateHtmlReport(bundle)
  const htmlPath = path.join(reportsDir, 'strategy-lab.html')
  fs.writeFileSync(htmlPath, htmlContent)
  console.log(`✓ Generated standalone HTML report: ${htmlPath}`)

  console.log('='.repeat(80))
  console.log('✨ Strategy Lab datasets ready!')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(console.error)
}
