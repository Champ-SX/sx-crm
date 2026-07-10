import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a timestamp coming from the database as UTC.
 *
 * Supabase columns are declared `TIMESTAMP` (timezone-naive), so PostgREST
 * returns values without a zone suffix (e.g. "2026-07-07T10:00:00"). Passing
 * such a string to `new Date()` parses it as LOCAL time, which shifts the
 * displayed time by the local UTC offset (+7h in Thailand). We store UTC, so
 * append a "Z" when no zone is present to force UTC parsing. Idempotent:
 * strings that already carry a zone (`Z` or `±HH:MM`) are left untouched, and
 * `Date`/number inputs pass straight through.
 */
export function parseDbDate(value: string | number | Date): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
  // Only date-time values (with a "T") are UTC-naive; leave date-only strings as-is.
  const normalized = !hasZone && value.includes('T') ? `${value}Z` : value
  return new Date(normalized)
}
