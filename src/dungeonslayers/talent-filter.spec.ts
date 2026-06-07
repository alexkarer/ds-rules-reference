import { describe, it, expect } from 'vitest'
import { filterTalents, learnableClasses, type TalentFilter } from './talent-filter'
import { DSClass } from './model/ds_class'
import type { DSTalent } from './model/talent'

type Req = [DSClass, number, string]

function talent(name: string, reqs: Req[], description = ''): DSTalent {
  return {
    name,
    description,
    classRequirements: reqs.map(([dsClass, classLevel, maxTalentRank]) => ({
      dsClass,
      classLevel,
      maxTalentRank,
    })),
  }
}

const brutalerHieb = talent('Brutaler Hieb', [[DSClass.KRI, 4, 'III']], 'Ein harter Schlag.')
const alchemie = talent('Alchemie', [[DSClass.ZAW, 1, 'V'], [DSClass.ERZ, 10, 'X']], 'Tränke brauen.')
const heilung = talent('Heilung', [[DSClass.Hei, 1, 'V']], 'Heilt Wunden.')
const ausweichen = talent(
  'Ausweichen',
  [[DSClass.KRI, 1, 'III'], [DSClass.SPÄ, 1, 'III'], [DSClass.ZAW, 1, 'III']],
  'Weicht Angriffen aus.',
)
const all = [brutalerHieb, alchemie, heilung, ausweichen]

const noFilter: TalentFilter = { classes: [], maxLevel: null, search: '' }
const names = (talents: DSTalent[]) => talents.map((t) => t.name)

describe('learnableClasses', () => {
  it('expands ZAW talents to Hei/Sch/Zau', () => {
    expect(learnableClasses(alchemie)).toEqual(
      new Set([DSClass.ZAW, DSClass.ERZ, DSClass.Hei, DSClass.Sch, DSClass.Zau]),
    )
  })

  it('does not expand non-ZAW talents', () => {
    expect(learnableClasses(heilung)).toEqual(new Set([DSClass.Hei]))
  })
})

describe('filterTalents', () => {
  it('returns all talents when no filter is set', () => {
    expect(filterTalents(all, noFilter)).toEqual(all)
  })

  describe('class filter', () => {
    it('matches talents that require the selected class', () => {
      expect(names(filterTalents(all, { ...noFilter, classes: [DSClass.KRI] }))).toEqual([
        'Brutaler Hieb',
        'Ausweichen',
      ])
    })

    it('lets Hei/Sch/Zau inherit ZAW talents', () => {
      // Hei matches its own talent (Heilung) and every ZAW talent (Alchemie, Ausweichen).
      expect(names(filterTalents(all, { ...noFilter, classes: [DSClass.Hei] }))).toEqual([
        'Alchemie',
        'Heilung',
        'Ausweichen',
      ])
    })

    it('does not let ZAW match Hei-only talents', () => {
      expect(names(filterTalents(all, { ...noFilter, classes: [DSClass.ZAW] }))).toEqual([
        'Alchemie',
        'Ausweichen',
      ])
    })

    it('matches talents sharing any of several selected classes', () => {
      expect(names(filterTalents(all, { ...noFilter, classes: [DSClass.ERZ, DSClass.KRI] }))).toEqual([
        'Brutaler Hieb',
        'Alchemie',
        'Ausweichen',
      ])
    })
  })

  describe('level filter', () => {
    it('keeps talents learnable at or below the level', () => {
      expect(names(filterTalents(all, { ...noFilter, maxLevel: 1 }))).toEqual([
        'Alchemie',
        'Heilung',
        'Ausweichen',
      ])
    })

    it('includes higher-level talents as the level rises', () => {
      expect(names(filterTalents(all, { ...noFilter, maxLevel: 4 }))).toEqual(names(all))
    })
  })

  describe('search filter', () => {
    it('matches a substring in the name', () => {
      expect(names(filterTalents(all, { ...noFilter, search: 'heil' }))).toEqual(['Heilung'])
    })

    it('matches a substring in the description', () => {
      expect(names(filterTalents(all, { ...noFilter, search: 'tränke' }))).toEqual(['Alchemie'])
    })

    it('is case-insensitive and ignores surrounding whitespace', () => {
      expect(names(filterTalents(all, { ...noFilter, search: '  SCHLAG ' }))).toEqual(['Brutaler Hieb'])
    })
  })

  it('combines all filters with AND', () => {
    // KRI-learnable AND learnable at level <= 1: Brutaler Hieb is KRI but level 4, so only Ausweichen.
    expect(
      names(filterTalents(all, { classes: [DSClass.KRI], maxLevel: 1, search: 'aus' })),
    ).toEqual(['Ausweichen'])
  })
})
