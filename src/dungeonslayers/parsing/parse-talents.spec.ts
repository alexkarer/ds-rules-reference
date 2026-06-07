import { describe, it, expect } from 'vitest'
import { parseTalents } from './parse-talents'
import type { TextLine } from './pdf-text'

/** Builds a TextLine fixture from plain strings (page/column/y are irrelevant here). */
function lines(...texts: string[]): TextLine[] {
  return texts.map((text, i) => ({ page: 1, column: 0, y: 1000 - i, text }))
}

describe('parseTalents', () => {
  it('parses name, single-line requirements, and description', () => {
    const result = parseTalents(
      lines(
        'ABKLINGEN',
        'ZAW 1 (V), ERZ 10 (X)',
        'Dieses Talent reduziert die Abklingzeit',
        'von Zaubern.',
        'REGELN',
      ),
    )

    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('ABKLINGEN')
    expect(result[0]!.classRequirements).toEqual([
      { dsClass: 'ZAW', classLevel: 1, maxTalentRank: 'V' },
      { dsClass: 'ERZ', classLevel: 10, maxTalentRank: 'X' },
    ])
    expect(result[0]!.description).toBe('Dieses Talent reduziert die Abklingzeit von Zaubern.')
  })

  it('collects requirements that wrap across two lines and preserves token case', () => {
    const result = parseTalents(
      lines(
        'ABKLINGEN',
        'Hei 12 (III), Sch 8 (III),',
        'ELE 10 (V)',
        'Eine Beschreibung.',
        'REGELN',
      ),
    )

    expect(result[0]!.classRequirements).toEqual([
      { dsClass: 'Hei', classLevel: 12, maxTalentRank: 'III' },
      { dsClass: 'Sch', classLevel: 8, maxTalentRank: 'III' },
      { dsClass: 'ELE', classLevel: 10, maxTalentRank: 'V' },
    ])
  })

  it('separates consecutive talents and ignores text before the start sentinel', () => {
    const result = parseTalents(
      lines(
        'TALENTE DER DREI GRUNDKLASSEN',
        'Waffenkenner 8 (III)',
        'ABKLINGEN',
        'ZAW 1 (V)',
        'Erste Beschreibung.',
        'ARKANE EXPLOSION',
        'Zau 8 (III)',
        'Zweite Beschreibung.',
        'REGELN',
      ),
    )

    expect(result.map((t) => t.name)).toEqual(['ABKLINGEN', 'ARKANE EXPLOSION'])
    expect(result[1]!.description).toBe('Zweite Beschreibung.')
  })

  it('splits requirements from description prose sharing one line', () => {
    const result = parseTalents(
      lines(
        'ABKLINGEN',
        'KRI 4 (III), SPÄ 1 (III), ZAW 4 (III) Der Charakter ist ein geübter Kletterer.',
        'REGELN',
      ),
    )

    expect(result[0]!.classRequirements).toEqual([
      { dsClass: 'KRI', classLevel: 4, maxTalentRank: 'III' },
      { dsClass: 'SPÄ', classLevel: 1, maxTalentRank: 'III' },
      { dsClass: 'ZAW', classLevel: 4, maxTalentRank: 'III' },
    ])
    expect(result[0]!.description).toBe('Der Charakter ist ein geübter Kletterer.')
  })

  it('handles requirement blocks that wrap mid-token across lines', () => {
    const result = parseTalents(
      lines(
        'ABKLINGEN',
        'KRI 4 (III), SPÄ 1 (III), ZAW 4 (III), ATT 10 (V), KMÖ',
        '10 (V), MDB 10 (V)',
        'Der Charakter ist ein geübter Kletterer.',
        'REGELN',
      ),
    )

    expect(result[0]!.classRequirements).toEqual([
      { dsClass: 'KRI', classLevel: 4, maxTalentRank: 'III' },
      { dsClass: 'SPÄ', classLevel: 1, maxTalentRank: 'III' },
      { dsClass: 'ZAW', classLevel: 4, maxTalentRank: 'III' },
      { dsClass: 'ATT', classLevel: 10, maxTalentRank: 'V' },
      { dsClass: 'KMÖ', classLevel: 10, maxTalentRank: 'V' },
      { dsClass: 'MDB', classLevel: 10, maxTalentRank: 'V' },
    ])
    expect(result[0]!.description).toBe('Der Charakter ist ein geübter Kletterer.')
  })

  it('repairs hyphenated line wraps in descriptions', () => {
    const result = parseTalents(
      lines('ABKLINGEN', 'ZAW 1 (V)', 'Charakterindividuali-', 'sierung erfolgt.', 'REGELN'),
    )

    expect(result[0]!.description).toBe('Charakterindividualisierung erfolgt.')
  })

  it('returns an empty list when the start sentinel is absent', () => {
    expect(parseTalents(lines('SOMETHING', 'else'))).toEqual([])
  })

  // Regression cases drawn from the real ds-rules.pdf layout. See
  // scripts/verify-talents.mjs for the same checks against the actual document.
  describe('real-PDF edge cases', () => {
    it('drops the running "TALENTE" header that sits inside a description column', () => {
      const result = parseTalents(
        lines(
          'ABKLINGEN',
          'BLU 12 (V)',
          'Der Blutmagier kann Abklingzeiten senken.',
          'Abklingen kombinierbar.',
          'TALENTE', // per-page running header bleeding into the column
          'ADERSCHLITZER',
          'KRI 12 (III), SPÄ 8 (III)',
          'Senkt die Abwehr des Gegners.',
          'REGELN',
        ),
      )

      expect(result.map((t) => t.name)).toEqual(['ABKLINGEN', 'ADERSCHLITZER'])
      expect(result[0]!.description).toBe(
        'Der Blutmagier kann Abklingzeiten senken. Abklingen kombinierbar.',
      )
    })

    it('skips the full-page class summary table ("TALENTE DER …")', () => {
      const result = parseTalents(
        lines(
          'ABKLINGEN',
          'KRI 4 (III)',
          'Der Charakter ist ein geübter Kletterer.',
          'TALENTE DER DREI GRUNDKLASSEN',
          'KRIEGER: SPÄHER:',
          'Aderschlitzer 12 (III) Aderschlitzer 8 (III)',
          'Akrobat 4 (III) Akrobat 1 (III)',
          'ALCHEMIE',
          'ZAW 1 (V), ERZ 10 (X)',
          'Dieses Talent wird benötigt, um Tränke zu brauen.',
          'REGELN',
        ),
      )

      expect(result.map((t) => t.name)).toEqual(['ABKLINGEN', 'ALCHEMIE'])
      expect(result[0]!.description).toBe('Der Charakter ist ein geübter Kletterer.')
      expect(result[1]!.description).toBe('Dieses Talent wird benötigt, um Tränke zu brauen.')
    })

    it('skips an embedded stat block but keeps the surrounding description', () => {
      const result = parseTalents(
        lines(
          'ABKLINGEN',
          'ERZ 14 (III)',
          'Der Erzmagier erschafft einen Begleiter.',
          'einsilbige Befehle ihres Erschaffers.',
          'HOMUNKULUS', // duplicate heading introducing the stat block
          'KÖR: 4 AGI: 4 GEI: 4',
          'ST: 0-6 BE: 0-6 VE: 0-6',
          'HÄ: 0-6 GE: 0-6 AU: 0-6',
          'KLEIN:',
          'LK/2',
          'Befindet sich der Homunkulus in der Nähe, hilft er.',
          'REGELN',
        ),
      )

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('ABKLINGEN')
      expect(result[0]!.classRequirements).toEqual([
        { dsClass: 'ERZ', classLevel: 14, maxTalentRank: 'III' },
      ])
      expect(result[0]!.description).toBe(
        'Der Erzmagier erschafft einen Begleiter. einsilbige Befehle ihres Erschaffers. ' +
          'Befindet sich der Homunkulus in der Nähe, hilft er.',
      )
      expect(result[0]!.description).not.toMatch(/KÖR:|GEI:/)
    })

    it('recognises headings that end with punctuation ("ICH MUSS WEG!")', () => {
      const result = parseTalents(
        lines(
          'ABKLINGEN',
          'BLU 12 (V)',
          'Erste Beschreibung.',
          'ICH MUSS WEG!',
          'KMÖ 12 (III), MDB 10 (III)',
          'Der Charakter kann Angriffe komplett ignorieren.',
          'REGELN',
        ),
      )

      expect(result.map((t) => t.name)).toEqual(['ABKLINGEN', 'ICH MUSS WEG!'])
      expect(result[1]!.classRequirements).toEqual([
        { dsClass: 'KMÖ', classLevel: 12, maxTalentRank: 'III' },
        { dsClass: 'MDB', classLevel: 10, maxTalentRank: 'III' },
      ])
      expect(result[1]!.description).toBe('Der Charakter kann Angriffe komplett ignorieren.')
    })
  })
})
