import type { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { parseSheet, type SaleRow } from './parse'

// Server-side import (SFTP auto-import): same parsers, same duplicate / conflict
// rules as the Upload page (lib/supabase/sales.ts), but with a service client.

export interface ServerFile { name: string; data: Buffer }
export interface ServerImportResult {
  import_id: string | null
  files: { name: string; format: string; rows: number; new: number; dup: number; conflict: number; review: number; excluded: number; from: string | null; to: string | null; gross_satang: number }[]
  new_rows: number; dup_rows: number; review_rows: number
}

function rowsOf(f: ServerFile): unknown[][] {
  const wb = /\.csv$/i.test(f.name) ? XLSX.read(f.data.toString('utf8'), { type: 'string', raw: true }) : XLSX.read(f.data)
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null })
}
const same = (a: Pick<SaleRow, 'amount_satang' | 'biz_date' | 'machine'>, b: Pick<SaleRow, 'amount_satang' | 'biz_date' | 'machine'>) =>
  Number(a.amount_satang) === b.amount_satang && String(a.biz_date ?? '') === b.biz_date && a.machine === b.machine

export async function importFilesServer(sb: SupabaseClient, files: ServerFile[], by: string): Promise<ServerImportResult> {
  const parsed = files.map((f) => ({ f, res: parseSheet(rowsOf(f)) }))
  const all = parsed.flatMap(({ f, res }) => res.rows.map((r) => ({ ...r, source_file: f.name })))

  // Existing rows by key
  const keys = [...new Set(all.map((r) => r.key))]
  const existing = new Map<string, { amount_satang: number; biz_date: string | null; machine: number | null }>()
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await sb.from('sales_txns').select('key, amount_satang, biz_date, machine').in('key', keys.slice(i, i + 200))
    if (error) throw error
    for (const r of data ?? []) existing.set(String(r.key), { amount_satang: Number(r.amount_satang), biz_date: r.biz_date as string | null, machine: r.machine as number | null })
  }
  const seen = new Map<string, SaleRow>()
  const items = all.map((row) => {
    const prev = existing.get(row.key) ?? seen.get(row.key)
    if (prev) return { row, kind: same(prev as SaleRow, row) ? 'dup' as const : 'conflict' as const }
    seen.set(row.key, row)
    return { row, kind: row.review ? 'review' as const : 'new' as const }
  })

  const summary = parsed.map(({ f, res }) => {
    const mine = items.filter((i) => i.row.source_file === f.name)
    const ds = res.rows.map((r) => r.biz_date).filter(Boolean).sort()
    return {
      name: f.name, format: res.format, rows: res.rows.length, excluded: res.excluded.length,
      new: mine.filter((i) => i.kind === 'new').length, dup: mine.filter((i) => i.kind === 'dup').length,
      conflict: mine.filter((i) => i.kind === 'conflict').length, review: mine.filter((i) => i.kind === 'review').length,
      from: ds[0] ?? null, to: ds[ds.length - 1] ?? null,
      gross_satang: mine.filter((i) => i.kind === 'new' && i.row.status === 'success').reduce((s, i) => s + i.row.amount_satang, 0),
    }
  }).filter((f) => f.format !== 'combined' && f.format !== 'unknown')

  const insert = items.filter((i) => i.kind === 'new' || i.kind === 'review')
  const conflicts = items.filter((i) => i.kind === 'conflict')
  const result: ServerImportResult = {
    import_id: null, files: summary,
    new_rows: items.filter((i) => i.kind === 'new').length, dup_rows: items.filter((i) => i.kind === 'dup').length,
    review_rows: items.filter((i) => i.kind === 'review' || i.kind === 'conflict').length,
  }
  if (!insert.length && !conflicts.length) return result   // nothing new: no history entry

  const import_id = crypto.randomUUID()
  const now = new Date().toISOString()
  const { error: e1 } = await sb.from('sales_imports').insert({ import_id, files: summary, new_rows: result.new_rows, dup_rows: result.dup_rows, review_rows: result.review_rows, created_by: by, created_at: now })
  if (e1) throw e1
  try {
    const rows = insert.map((i) => ({ ...i.row, biz_date: i.row.biz_date || null, import_id, conflict: null }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from('sales_txns').upsert(rows.slice(i, i + 500), { onConflict: 'key', ignoreDuplicates: true })
      if (error) throw error
    }
    for (const c of conflicts) {
      const { error } = await sb.from('sales_txns').update({ conflict: { amount_satang: c.row.amount_satang, biz_date: c.row.biz_date, machine: c.row.machine, file: c.row.source_file, at: now }, updated_at: now }).eq('key', c.row.key)
      if (error) throw error
    }
  } catch (err) {
    await sb.from('sales_txns').delete().eq('import_id', import_id)
    await sb.from('sales_imports').delete().eq('import_id', import_id)
    throw err
  }
  result.import_id = import_id
  return result
}
