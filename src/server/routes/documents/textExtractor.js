import { PDFParse } from 'pdf-parse'

/**
 * Extracts plain text and page metadata from a file buffer.
 *
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} mimetype - MIME type of the file
 * @param {string} [filename=''] - Optional filename for extension fallback
 * @returns {Promise<Array<{ page: number|null, text: string }>>}
 */
export async function extractDocumentText(buffer, mimetype = '', filename = '') {
  const isPdf = mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    return extractPdfText(buffer)
  }

  // Fallback for plain text, markdown, csv, json, etc.
  const rawText = buffer.toString('utf-8')
  return [
    {
      page: null,
      text: rawText,
    },
  ]
}

/**
 * Extracts text page-by-page from a PDF buffer using pdf-parse.
 */
async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()

  if (!result || !result.pages || result.pages.length === 0) {
    return [
      {
        page: 1,
        text: '',
      },
    ]
  }

  return result.pages
    .map((p, idx) => ({
      page: p.page ?? idx + 1,
      text: (p.text || '').trim(),
    }))
    .filter((p) => p.text.length > 0)
}
