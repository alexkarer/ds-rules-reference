/**
 * Manual end-to-end check of the talent parser against the real rules PDF.
 *
 * Unit tests cover the parser with synthetic fixtures; this script exercises it
 * against ds-rules.pdf so layout-specific regressions are caught. The PDF text
 * extraction below mirrors src/dungeonslayers/parsing/pdf-text.ts (which can't be
 * imported directly here because it uses Vite's `?worker` import). The parser
 * itself is imported from source via jiti, so this verifies the real logic.
 *
 * Run with: npm run verify:talents
 * Exits non-zero if any expectation fails.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createJiti } from 'jiti'

const PDF_PATH = fileURLToPath(new URL('../ds-rules.pdf', import.meta.url))
const PARSER_PATH = fileURLToPath(new URL('../src/dungeonslayers/parsing/parse-talents.ts', import.meta.url))

const jiti = createJiti(import.meta.url)
const { parseTalents } = await jiti.import(PARSER_PATH)

// --- Extraction (mirror of pdf-text.ts) ---
const LINE_TOLERANCE = 4
const MARGIN_FRACTION = 0.05

function groupColumn(items, page, column) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  let current = []
  const flush = () => {
    if (!current.length) return
    const text = current.map((i) => i.text).join(' ').replace(/\s+/g, ' ').trim()
    if (text) lines.push({ page, column, y: current[0].y, text })
    current = []
  }
  for (const item of sorted) {
    if (current.length && Math.abs(item.y - current[0].y) > LINE_TOLERANCE) flush()
    current.push(item)
  }
  flush()
  return lines
}

async function extractLines(data) {
  const doc = await getDocument({ data }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const midX = vp.width / 2
    const minY = vp.height * MARGIN_FRACTION
    const maxY = vp.height * (1 - MARGIN_FRACTION)
    const content = await page.getTextContent()
    const left = [], right = []
    for (const it of content.items) {
      if (typeof it.str !== 'string' || !Array.isArray(it.transform)) continue
      if (it.transform[1] !== 0 || it.transform[2] !== 0) continue
      if (!it.str.trim()) continue
      const x = it.transform[4], y = it.transform[5]
      if (y < minY || y > maxY) continue
      ;(x + it.width / 2 < midX ? left : right).push({ x, y, text: it.str })
    }
    lines.push(...groupColumn(left, p, 0), ...groupColumn(right, p, 1))
    page.cleanup()
  }
  return lines
}

// --- Expectations ---
const lines = await extractLines(new Uint8Array(readFileSync(PDF_PATH)))
const talents = parseTalents(lines)
const byName = (n) => talents.find((t) => t.name === n)

const failures = []
const check = (label, condition) => {
  console.log(`${condition ? '✓' : '✗'} ${label}`)
  if (!condition) failures.push(label)
}

const names = talents.map((t) => t.name)
check(`parsed a healthy number of talents (got ${talents.length})`, talents.length >= 120)
check('no duplicate talent names', new Set(names).size === names.length)
check('no NaN talent ranks', talents.every((t) => t.classRequirements.every((r) => !Number.isNaN(r.maxTalentRank))))
check('all talents have a non-empty description', talents.every((t) => t.description.length > 0))

const abk = byName('ABKLINGENDES BLUT')
check('ABKLINGENDES BLUT exists', !!abk)
check('ABKLINGENDES BLUT description has no leaked "TALENTE" header', !!abk && !/\bTALENTE\b/.test(abk.description))
check('ABKLINGENDES BLUT description ends correctly', !!abk && abk.description.endsWith('kombinierbar.'))

const akr = byName('AKROBAT')
check('AKROBAT exists', !!akr)
check('AKROBAT description has no page-28 summary text', !!akr && !/GRUNDKLASSEN|Aderschlitzer|KRIEGER/.test(akr.description))
check('AKROBAT description ends correctly', !!akr && akr.description.endsWith('+2 pro Talentrang.'))

const hom = talents.filter((t) => t.name === 'HOMUNKULUS')
check('HOMUNKULUS exists exactly once', hom.length === 1)
check('HOMUNKULUS has the ERZ requirement', hom.length === 1 && hom[0].classRequirements.some((r) => r.dsClass === 'ERZ'))
check('HOMUNKULUS keeps pre-statblock text', hom.length === 1 && hom[0].description.includes('Der Erzmagier erschafft'))
check('HOMUNKULUS keeps post-statblock text', hom.length === 1 && hom[0].description.includes('Befindet sich der Homunkulus'))
check('HOMUNKULUS drops the stat block rows', hom.length === 1 && !/KÖR:|GEI:/.test(hom[0].description))

const ich = byName('ICH MUSS WEG!')
check('ICH MUSS WEG! exists', !!ich)
check('ICH MUSS WEG! has KMÖ + MDB requirements', !!ich && ich.classRequirements.map((r) => r.dsClass).join(',') === 'KMÖ,MDB')
check('ICH MUSS WEG! description parsed', !!ich && ich.description.includes('komplett ignorieren'))

console.log(`\n${talents.length} talents parsed. ${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} CHECK(S) FAILED`}`)
process.exit(failures.length === 0 ? 0 : 1)
