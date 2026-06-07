import { DSClass } from '../model/ds_class'
import { type DSTalent } from '../model/talent'
import type { TextLine } from './pdf-text'

const DS_CLASSES = new Set<string>(Object.values(DSClass))

/** Maps a raw requirement abbreviation to a DSClass, or null if it is unknown. */
function toDSClass(token: string): DSClass | null {
  return DS_CLASSES.has(token) ? (token as DSClass) : null
}

/** First entry of the alphabetical talent list; marks where parsing starts. */
const SECTION_START = 'ABKLINGEN'
/** The "3. REGELN" section title that follows the talent list; marks the end. */
const SECTION_END = /^\d*\.?\s*REGELN$/

/** Running-header / section words that look like talent headings but are not. */
const NOISE = /^(TALENTE|CHARAKTERE|REGELN|ZAUBERSPR|AUSR|SPIELLEITUNG|ABENTEUER|DIE WELT|ANH|INDEX)/
/** Start of a full-page class-talent summary table (e.g. "TALENTE DER DREI GRUNDKLASSEN"). */
const SUMMARY_START = /^TALENTE DER /

/** A single requirement token at the start of the remaining text, e.g. "KRI 1 (III), ". */
const REQ_TOKEN = /^([A-Za-zÄÖÜäöü]{2,5})\s+(\d+)\s*\(([IVXLCDM]+)\)\s*,?\s*/
/** An all-caps heading: letters/spaces/hyphens/apostrophes/"!", no digits. */
const HEADING = /^[A-ZÄÖÜ][A-ZÄÖÜ '!-]{2,39}$/

/** First line of a creature stat block, e.g. "KÖR: 4 AGI: 4 GEI: 4". */
const STAT_ROW = /^(KÖR|AGI|GEI|ST|BE|VE|HÄ|GE|AU)\s*:/
const SIZE_LABEL = /^(WINZIG|KLEIN|MITTEL|GROß|GROSS|RIESIG|GIGANTISCH)\s*:?$/
const LK_LINE = /^LK\s*\/\s*\d+$/
const NUM_LINE = /^[\d\s]+$/

function isHeading(text: string): boolean {
  return HEADING.test(text) && !NOISE.test(text)
}

/** Whether a line is part of a creature stat block (skipped, but not its surrounding prose). */
function isStatBody(text: string): boolean {
  return STAT_ROW.test(text) || SIZE_LABEL.test(text) || LK_LINE.test(text) || NUM_LINE.test(text)
}

/** Joins wrapped lines into one string, repairing hyphenation at line breaks. */
function joinLines(lines: string[]): string {
  let text = ''
  for (const line of lines) {
    if (/[a-zäöü]-$/.test(text) && /^[a-zäöü]/.test(line)) {
      text = text.slice(0, -1) + line // hyphenated word wrap → merge, drop hyphen
    } else {
      text = text ? `${text} ${line}` : line
    }
  }
  return text.trim()
}

/**
 * Splits a joined talent body into its leading class-requirement tokens and the
 * remaining description prose. The whole body is parsed at once (rather than
 * line by line) because the requirement block can wrap mid-token across lines,
 * e.g. "… ATT 10 (V), KMÖ" / "10 (V), MDB 10 (V)".
 */
function splitBody(body: string): Pick<DSTalent, 'classRequirements' | 'description'> {
  const classRequirements: DSTalent['classRequirements'] = []
  let rest = body
  let match: RegExpExecArray | null
  while ((match = REQ_TOKEN.exec(rest))) {
    const dsClass = toDSClass(match[1]!)
    if (dsClass === null) {
      console.error(`Skipping unknown DS class in talent requirement: "${match[1]}"`)
    } else {
      classRequirements.push({
        dsClass,
        classLevel: Number(match[2]),
        maxTalentRank: match[3]!,
      })
    }
    rest = rest.slice(match[0].length)
  }
  return { classRequirements, description: rest.trim() }
}

/**
 * Parses the alphabetical talent list (ABKLINGEN … just before "3. REGELN")
 * from column-corrected lines. Each talent is an all-caps heading followed by a
 * class-requirement block and then description prose, up to the next heading.
 *
 * Handles three interruptions woven into the list:
 * - running headers ("TALENTE") and full-page class summaries ("TALENTE DER …"),
 *   which are dropped;
 * - creature stat blocks, which are introduced by a heading immediately followed
 *   by a stat row (e.g. the second "HOMUNKULUS" or "TEUFELCHEN I") — the block is
 *   skipped but the description prose around it is kept on the real talent.
 */
export function parseTalents(lines: TextLine[]): DSTalent[] {
  const startIdx = lines.findIndex((l) => l.text === SECTION_START)
  if (startIdx === -1) return []

  const talents: DSTalent[] = []
  let name: string | null = null
  let bodyLines: string[] = []
  let inSummary = false
  let inStatblock = false

  const commit = () => {
    if (name !== null) {
      talents.push({ name, ...splitBody(joinLines(bodyLines)) })
    }
    bodyLines = []
  }

  for (let i = startIdx; i < lines.length; i++) {
    const { text } = lines[i]!
    if (SECTION_END.test(text)) break

    if (isHeading(text)) {
      // A heading immediately followed by a stat row is a creature stat block
      // belonging to the current talent, not a new talent.
      if (name !== null && STAT_ROW.test(lines[i + 1]?.text ?? '')) {
        inStatblock = true
        inSummary = false
        continue
      }
      commit()
      name = text
      inSummary = false
      inStatblock = false
      continue
    }

    if (SUMMARY_START.test(text)) {
      inSummary = true
      continue
    }
    if (inSummary) continue
    if (NOISE.test(text)) continue // running header such as "TALENTE"

    if (inStatblock) {
      if (isStatBody(text)) continue
      inStatblock = false // first prose line ends the stat block
    }

    if (name !== null) bodyLines.push(text)
  }
  commit()

  // Every real talent lists class prerequisites; entries without them are false
  // headings from embedded tables or sidebars (e.g. "KLASSE VERTRAUTENBONUS",
  // "LICHT UND DUNKELHEIT").
  return talents.filter((t) => t.classRequirements.length > 0)
}
