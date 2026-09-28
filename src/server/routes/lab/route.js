import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAllExperiments } from '../../../../strategies/lib/comparison-runner.js'
import { generateHtmlReport } from '../../../../strategies/generate-comparison.js'
import {
  clearDatabase,
  updateSettings,
  seedCorpusDocument,
} from '../../../../strategies/lib/db-seeder.js'
import { resolveCorpusForExperiment } from '../../../../strategies/stage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const labDataPath = path.resolve(__dirname, '../../../../strategies/data/lab-experiments.json')
const legacyDataPath = path.resolve(__dirname, '../../../../strategies/data/comparison-results.json')

export default async function (fastify, opts) {
  // 1. Fetch raw multi-experiment comparison data
  fastify.get('/data', async (request, reply) => {
    if (fs.existsSync(labDataPath)) {
      const content = fs.readFileSync(labDataPath, 'utf8')
      return JSON.parse(content)
    }

    const data = await runAllExperiments()
    fs.mkdirSync(path.dirname(labDataPath), { recursive: true })
    fs.writeFileSync(labDataPath, JSON.stringify(data, null, 2))
    return data
  })

  // 2. Render Strategy Lab HTML Dashboard
  fastify.get('/view', async (request, reply) => {
    reply.type('text/html')
    let data
    if (fs.existsSync(labDataPath)) {
      data = JSON.parse(fs.readFileSync(labDataPath, 'utf8'))
    } else if (fs.existsSync(legacyDataPath)) {
      data = JSON.parse(fs.readFileSync(legacyDataPath, 'utf8'))
    } else {
      data = await runAllExperiments()
    }
    return generateHtmlReport(data)
  })

  // 3. Stage a specific strategy directly from the Strategy Lab UI
  fastify.post('/stage', async (request, reply) => {
    const expId = request.query?.expId || '01'
    const expConfig = resolveCorpusForExperiment(expId)

    const chunkSize = Number(request.query?.chunkSize || expConfig.defaults.chunkSize || 500)
    const overlap = Number(request.query?.overlap || expConfig.defaults.overlap || 50)
    const topK = Number(request.query?.topK || expConfig.defaults.topK || 5)

    clearDatabase()
    updateSettings({ chunkSize, overlap, topK, model: 'gpt-4o-mini' })

    const docName = `${expConfig.docName} (${chunkSize}t / ${overlap}ovlp, Top-K=${topK})`
    const ingestion = await seedCorpusDocument({
      corpusPath: expConfig.corpusPath,
      docName,
      chunkSize,
      overlap,
    })

    return {
      success: true,
      message: `Successfully staged ${expConfig.shortName || expId} (${chunkSize}t/${overlap}ovlp, Top-K=${topK}) using ${path.basename(expConfig.corpusPath)}`,
      documentId: ingestion.documentId,
      chunkCount: ingestion.chunkCount,
      corpus: path.basename(expConfig.corpusPath),
    }
  })
}
