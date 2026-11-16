// Client groups by machine number (finance's inclusive ranges — source of truth).
export interface SalesGroup { id: string; name: string; from: number; to: number }
export const SALES_GROUPS: SalesGroup[] = [
  { id: 'captures', name: 'Captures', from: 1, to: 35 },
  { id: 'true', name: 'True', from: 40, to: 50 },
  { id: 'bacc', name: 'BACC', from: 60, to: 66 },
  { id: 'c11', name: 'C11', from: 71, to: 74 },
  { id: 'btt', name: 'BTT', from: 80, to: 86 },
]
export const UNASSIGNED = 'Unassigned'

export function groupOf(machine: number | null | undefined): string {
  if (machine == null) return UNASSIGNED
  return SALES_GROUPS.find((g) => machine >= g.from && machine <= g.to)?.name ?? UNASSIGNED
}
export const machinesOf = (g: SalesGroup) => Array.from({ length: g.to - g.from + 1 }, (_, i) => g.from + i)
export const ALL_ASSIGNED = SALES_GROUPS.flatMap(machinesOf)
