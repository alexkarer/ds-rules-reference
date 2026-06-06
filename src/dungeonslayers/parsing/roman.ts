const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

/**
 * Converts a Roman numeral to an integer. Talent max-ranks in the rules use
 * I..X, but the full set is supported. Returns NaN for non-Roman input.
 */
export function romanToInt(roman: string): number {
  const s = roman.trim().toUpperCase()
  if (!s || !/^[IVXLCDM]+$/.test(s)) return NaN

  let total = 0
  for (let i = 0; i < s.length; i++) {
    const value = VALUES[s[i]!]!
    const nextChar = s[i + 1]
    const next = nextChar ? VALUES[nextChar]! : 0
    total += next > value ? -value : value
  }
  return total
}
