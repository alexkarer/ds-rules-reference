import { describe, it, expect } from 'vitest'
import { romanToInt } from './roman'

describe('romanToInt', () => {
  it('converts the numerals used by talent ranks', () => {
    expect(romanToInt('I')).toBe(1)
    expect(romanToInt('III')).toBe(3)
    expect(romanToInt('V')).toBe(5)
    expect(romanToInt('X')).toBe(10)
  })

  it('handles subtractive notation', () => {
    expect(romanToInt('IV')).toBe(4)
    expect(romanToInt('IX')).toBe(9)
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(romanToInt(' iii ')).toBe(3)
  })

  it('returns NaN for non-Roman input', () => {
    expect(romanToInt('')).toBeNaN()
    expect(romanToInt('ABC')).toBeNaN()
  })
})
