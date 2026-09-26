import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSideBySideComparison } from '../../../../strategies/lib/comparison-runner.js'
import { generateHtmlReport } from '../../../../strategies/generate-comparison.js'
import {
  clearDatabase,
  updateSettings,
  seedCorpusDocument,
  executeEndToEndChatTurn,
} from '../../../../strategies/lib/db-seeder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFilePath = path.resolve(__dirname, '../../../../strategies/data/comparison-results.json')
const corpusPath = path.resolve(__dirname, '../../../../strategies/corpora/policy-operations.md')

export default async function (fastify, opts) {
  // 1. Fetch raw comparison data
  fastify.get('/data', async (request, reply) => {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, 'utf8')
      return JSON.parse(content)
    }

    const data = await runSideBySideComparison({ topK: 5 })
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true })
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2))
    return data
  })

  // 2. Render Strategy Lab HTML Dashboard
  fastify.get('/view', async (request, reply) => {
    reply.type('text/html')
    let data
    if (fs.existsSync(dataFilePath)) {
      data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'))
    } else {
      data = await runSideBySideComparison({ topK: 5 })
    }
    return generateHtmlReport(data)
  })

  // 3. Stage a specific strategy directly from the Strategy Lab UI
  fastify.post('/stage', async (request, reply) => {
    const chunkSize = Number(request.query?.chunkSize || 500)
    const overlap = Number(request.query?.overlap || 50)
    const topK = Number(request.query?.topK || 5)

    clearDatabase()
    updateSettings({ chunkSize, overlap, topK, model: 'gpt-4o-mini' })

    const docName = `[EXP] Enterprise Policy Manual (${chunkSize}t / ${overlap}ovlp)`
    const ingestion = await seedCorpusDocument({
      corpusPath,
      docName,
      chunkSize,
      overlap,
    })

    return {
      success: true,
      message: `Successfully staged ${chunkSize}t/${overlap}ovlp configuration into active database`,
      documentId: ingestion.documentId,
      chunkCount: ingestion.chunkCount,
    }
  })
}
