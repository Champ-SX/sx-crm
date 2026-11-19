// Machine groups (Sales Finance, 19 Nov 2026 — source of truth). Machine numbers are unique across prefixes.
export interface SalesGroup { id: string; name: string; range: string; ms: number[]; color: string }
const span = (a: number, b: number, skip: number[] = []) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((n) => !skip.includes(n))
export const SALES_GROUPS: SalesGroup[] = [
  { id: 'space', name: 'Space activation', range: 'K001–K015 · 058', ms: [...span(1, 15), 58], color: '#2F6FDB' },
  { id: 'event', name: 'Event', range: 'K016–K037', ms: span(16, 37, span(21, 26)), color: '#C8643B' },
  { id: 'laos', name: 'Laos', range: 'L021–L026', ms: span(21, 26), color: '#D9822B' },
  { id: 'true', name: 'TRUE alpha', range: 'T040–T050', ms: span(40, 50), color: '#C9423B' },
  { id: 'phuket', name: 'Phuket', range: 'F051–F057 · 059', ms: [...span(51, 57), 59], color: '#0F8B8D' },
  { id: 'bacc', name: 'Andy & Fine. BACC', range: 'A060–A066', ms: span(60, 66), color: '#1E9E62' },
  { id: 'c11', name: 'Andy & Fine. Cloud11', range: 'C071–C074', ms: span(71, 74), color: '#8A9A2B' },
  { id: 'btt', name: 'Andy & Fine. BTT', range: 'B080–B086', ms: span(80, 86), color: '#7A5AA5' },
  { id: 'moshi', name: 'Moshi Moshi', range: 'M201–M208', ms: span(201, 208), color: '#B5467F' },
]
export const UNASSIGNED = 'Unassigned'
export const UNASSIGNED_COLOR = '#A8A39A'
export const GROUP_COLORS: Record<string, string> = { ...Object.fromEntries(SALES_GROUPS.map((g) => [g.name, g.color])), [UNASSIGNED]: UNASSIGNED_COLOR }

const BY_NO = new Map(SALES_GROUPS.flatMap((g) => g.ms.map((n) => [n, g] as const)))
export const groupRecOf = (machine: number | null | undefined) => (machine == null ? undefined : BY_NO.get(machine))
export function groupOf(machine: number | null | undefined): string {
  return groupRecOf(machine)?.name ?? UNASSIGNED
}

// ── Client report files: NEVER change (finance rule). Old ranges, old names, old file names. ──
export const CLIENT_GROUPS = [
  { name: 'Captures', from: 1, to: 35 }, { name: 'True', from: 40, to: 50 }, { name: 'BACC', from: 60, to: 66 },
  { name: 'C11', from: 71, to: 74 }, { name: 'BTT', from: 80, to: 86 },
] as const
/** "Product Group" column in client report files. */
export const clientGroupOf = (machine: number | null | undefined) =>
  machine == null ? UNASSIGNED : CLIENT_GROUPS.find((g) => machine >= g.from && machine <= g.to)?.name ?? UNASSIGNED
export const machinesOf = (g: SalesGroup) => g.ms
export const ALL_ASSIGNED = SALES_GROUPS.flatMap(machinesOf).sort((a, b) => a - b)
