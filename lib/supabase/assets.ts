import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { AnfAsset, AnfAssetMove, AssetLocationKind } from '@/types'

// Order board · section 2 — asset units + move log. Shared module store (like suppliers).

// ── Locations ────────────────────────────────────────────────────────────────
// Rack layout — one line to change after the physical rack check.
export const RACKS = ['R1', 'R2', 'R3']
export const SHELVES = ['A', 'B', 'C']
export const EVENT_SLOTS = ['SET1', 'SET2', 'SET3']   // equipment sets that travel to an event together
/** Older rows were saved as EV1/EV2… — show them as SET1/SET2… */
export const normSlot = (s: string | null | undefined) => (s ? s.replace(/^EV(\d+)$/i, 'SET$1') : s ?? null)

export const LOCATION_KINDS: { kind: AssetLocationKind; short: string; label: string; cls: string }[] = [
  { kind: 'rack',    short: 'R',   label: 'Rack',     cls: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
  { kind: 'factory', short: 'F',   label: 'Factory',  cls: 'bg-muted text-foreground' },
  { kind: 'event',   short: 'EV',  label: 'On event', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
  { kind: 'repair',  short: 'REPAIR',  label: 'Repair',  cls: 'bg-red-500/12 text-red-700 dark:text-red-300' },
  { kind: 'lost',    short: 'LOST',    label: 'Lost',    cls: 'bg-red-500/12 text-red-700 dark:text-red-300' },
  { kind: 'retired', short: 'RETIRED', label: 'Retired', cls: 'bg-muted text-muted-foreground line-through' },
]
export const locMeta = (k: AssetLocationKind) => LOCATION_KINDS.find((l) => l.kind === k) ?? LOCATION_KINDS[0]

/** "R1 · A", "F", "EV2 · #112", "REPAIR" */
export function locationLabel(a: Pick<AnfAsset, 'location_kind' | 'location_slot'>, jobNumber?: string | null): string {
  switch (a.location_kind) {
    case 'rack': return a.location_slot ? a.location_slot.replace('-', ' · ') : 'Rack'
    case 'factory': return 'F'
    case 'event': return [normSlot(a.location_slot) || 'EV', jobNumber ? `#${jobNumber}` : null].filter(Boolean).join(' · ')
    default: return locMeta(a.location_kind).short
  }
}

// ── Codes ────────────────────────────────────────────────────────────────────
const PREFIX: Record<string, string> = { computer: 'PC', camera: 'CAM', light: 'LGT', router: 'RTR', asset_other: 'AST' }
export const prefixFor = (category: string | null | undefined) =>
  PREFIX[category ?? ''] ?? ((category ?? 'AST').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase() || 'AST')
/** Next free code for a prefix — max existing + 1, so retired codes are never re-used. */
export function nextCode(prefix: string, existing: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  const max = existing.reduce((m, c) => { const n = re.exec(c)?.[1]; return n ? Math.max(m, parseInt(n, 10)) : m }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

// ── Store ────────────────────────────────────────────────────────────────────
const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ast-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newAssetId = mkId

let assets: AnfAsset[] = []
let moves: AnfAssetMove[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

async function load() {
  if (!isSupabaseConfigured) { loaded = true; emit(); return }   // mock: starts empty, add units to try it
  const [a, m] = await Promise.all([
    supabase.from('anf_assets').select('*').order('code'),
    supabase.from('anf_asset_moves').select('*').order('moved_at', { ascending: false }).limit(2000),
  ])
  if (a.error) console.warn('[assets] load failed', a.error.message)
  if (m.error) console.warn('[assets] moves load failed', m.error.message)
  assets = (a.data ?? []) as AnfAsset[]
  moves = (m.data ?? []) as AnfAssetMove[]
  loaded = true; emit()
}

export function useAssets() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (!loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [])
  return { assets, moves, loaded }
}
export const movesFor = (assetId: string) => moves.filter((m) => m.asset_id === assetId).sort((a, b) => b.moved_at.localeCompare(a.moved_at))

export async function saveAsset(a: AnfAsset) {
  const row = { ...a, updated_at: new Date().toISOString() }
  assets = [...assets.filter((x) => x.asset_id !== a.asset_id), row].sort((x, y) => x.code.localeCompare(y.code))
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_assets').upsert(row)
  if (error) throw new Error(error.message)
}

/** Move an asset and log it (who / when / from → to). */
export async function moveAsset(a: AnfAsset, to: { kind: AssetLocationKind; slot: string | null; job_id: string | null },
  labels: { from: string; to: string }, by: string | null, note?: string | null) {
  const next: AnfAsset = { ...a, location_kind: to.kind, location_slot: to.slot, job_id: to.kind === 'event' ? to.job_id : null }
  const mv: AnfAssetMove = { id: mkId(), asset_id: a.asset_id, from_label: labels.from, to_label: labels.to, job_id: next.job_id ?? null, moved_by: by, moved_at: new Date().toISOString(), note: note ?? null }
  moves = [mv, ...moves]
  await saveAsset(next)
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_asset_moves').insert(mv)
  if (error) throw new Error(error.message)
}

/** Where an asset was before it went out — parsed from its last move into the event. */
export function returnTarget(a: AnfAsset): { kind: AssetLocationKind; slot: string | null } {
  const last = movesFor(a.asset_id).find((m) => m.job_id && m.job_id === a.job_id)
  const m = /^(?:New · )?(R\d+) · ([A-Z])$/.exec(last?.from_label ?? '')
  if (m) return { kind: 'rack', slot: `${m[1]}-${m[2]}` }
  if (last?.from_label === 'F') return { kind: 'factory', slot: null }
  return { kind: 'rack', slot: `${RACKS[0]}-${SHELVES[0]}` }
}
