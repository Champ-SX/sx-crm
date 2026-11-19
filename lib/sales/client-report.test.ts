// Client report files must never change (Sales Finance rule) — pinned to files sent to clients in Nov 2026.
import { describe, expect, it } from 'vitest'
import { clientGroupOf } from './groups'
import { reportFileName } from './report'

const nov = { from: '2026-11-01', to: '2026-11-30' }
const span = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

describe('client report format is frozen', () => {
  it('Product Group column keeps the old names and ranges', () => {
    expect(clientGroupOf(32)).toBe('Captures')       // SX_2026-11_Machine32.xlsx
    expect(clientGroupOf(47)).toBe('True')           // SX_2026-11_True_40-50.xlsx
    expect([1, 15, 21, 35].map(clientGroupOf)).toEqual(['Captures', 'Captures', 'Captures', 'Captures'])
    expect([36, 37, 51, 58, 59, 201].map(clientGroupOf)).toEqual(Array(6).fill('Unassigned'))
    expect([60, 71, 80].map(clientGroupOf)).toEqual(['BACC', 'C11', 'BTT'])
  })
  it('file names are unchanged', () => {
    expect(reportFileName(nov, [32])).toBe('SX_2026-11_Machine32.xlsx')
    expect(reportFileName(nov, span(40, 50))).toBe('SX_2026-11_True_40-50.xlsx')
    expect(reportFileName(nov, span(1, 35))).toBe('SX_2026-11_Captures_1-35.xlsx')
  })
})
