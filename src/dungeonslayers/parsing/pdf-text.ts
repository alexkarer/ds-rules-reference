import * as pdfjs from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
// Vite bundles the worker; `?worker` gives us a Worker constructor.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker'

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()

/**
 * A single line of text recovered from the PDF, tagged with the page it came
 * from and which body column it belongs to. The section parsers consume these
 * in reading order (left column fully, then right column, per page).
 */
export interface TextLine {
  page: number
  column: 0 | 1
  /** PDF user-space y of the line (origin bottom-left, larger = higher). */
  y: number
  text: string
}

/** Items whose y differ by less than this belong to the same visual line. */
const LINE_TOLERANCE = 4
/** Fraction of page height trimmed top and bottom to drop headers/footers/folios. */
const MARGIN_FRACTION = 0.05

function isTextItem(item: unknown): item is TextItem {
  return typeof (item as TextItem).str === 'string' && Array.isArray((item as TextItem).transform)
}

/** A rotated item (non-zero skew) is a side-tab running header, not body text. */
function isRotated(item: TextItem): boolean {
  return item.transform[1] !== 0 || item.transform[2] !== 0
}

interface PositionedItem {
  x: number
  y: number
  text: string
}

function groupColumn(items: PositionedItem[], page: number, column: 0 | 1): TextLine[] {
  // Sort top-to-bottom (descending y), then left-to-right within a line.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: TextLine[] = []
  let current: PositionedItem[] = []

  const flush = () => {
    if (current.length === 0) return
    const text = current
      .map((i) => i.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) lines.push({ page, column, y: current[0]!.y, text })
    current = []
  }

  for (const item of sorted) {
    if (current.length > 0 && Math.abs(item.y - current[0]!.y) > LINE_TOLERANCE) flush()
    current.push(item)
  }
  flush()
  return lines
}

/**
 * Extracts the document as column-corrected lines in reading order.
 *
 * The rules PDF is two-column; raw extraction interleaves the columns, so we
 * split each page's text items by x and emit the left column fully before the
 * right. `onProgress` is called with a 0..1 fraction after each page.
 */
export async function extractLines(
  data: ArrayBuffer,
  onProgress: (fraction: number) => void,
): Promise<TextLine[]> {
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const lines: TextLine[] = []

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      const midX = viewport.width / 2
      const minY = viewport.height * MARGIN_FRACTION
      const maxY = viewport.height * (1 - MARGIN_FRACTION)

      const content = await page.getTextContent()
      const left: PositionedItem[] = []
      const right: PositionedItem[] = []

      for (const raw of content.items) {
        if (!isTextItem(raw) || isRotated(raw) || !raw.str.trim()) continue
        const x = raw.transform[4]
        const y = raw.transform[5]
        if (y < minY || y > maxY) continue // header / footer / page folio
        const centerX = x + raw.width / 2
        ;(centerX < midX ? left : right).push({ x, y, text: raw.str })
      }

      lines.push(...groupColumn(left, pageNum, 0))
      lines.push(...groupColumn(right, pageNum, 1))

      page.cleanup()
      onProgress(pageNum / doc.numPages)
    }
  } finally {
    await loadingTask.destroy()
  }

  return lines
}
