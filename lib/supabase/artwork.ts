import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'

// CAPTURES.DESIGNER is its own app (sx-designer). It owns won_artwork_items;
// SX-CRM only READS it to show artwork progress on Won jobs.

export type ArtworkKind = 'print' | 'gif' | 'welcome' | 'wrap' | 'proof3d' | 'sent' | 'other'
export type ArtworkStatus = 'todo' | 'draft' | 'sent' | 'approved'

export interface ArtworkItem {
  id: string
  job_id: string
  kind: ArtworkKind
  label: string | null
  status: ArtworkStatus
  version: number
  owner_id: string | null
  drive_url: string | null
  canva_url: string | null
  position: number
  updated_at?: string
}

export const KIND_LABEL: Record<ArtworkKind, string> = {
  print: 'Print frame', gif: 'GIF frame', welcome: 'Welcome screen', wrap: 'Booth wrap',
  proof3d: '3D proof', sent: 'Sent to client', other: 'Other',
}
export const STATUS_LABEL: Record<ArtworkStatus, string> = { todo: 'To do', draft: 'Draft', sent: 'Sent', approved: 'Approved' }

/** The Designer app's address. Set NEXT_PUBLIC_DESIGNER_URL once it's deployed. */
export const DESIGNER_URL = (process.env.NEXT_PUBLIC_DESIGNER_URL || 'http://localhost:3001').replace(/\/$/, '')
export const designerJobUrl = (jobId: string) => `${DESIGNER_URL}/job/${encodeURIComponent(jobId)}`

const COLS = 'id,job_id,kind,label,status,version,owner_id,drive_url,canva_url,position,updated_at'

// ── Mock (local dev only) ───────────────────────────────────────────────────
const mk = (job_id: string, position: number, kind: ArtworkKind, label: string, status: ArtworkStatus, version: number): ArtworkItem =>
  ({ id: `${job_id}-aw-${position}`, job_id, kind, label, status, version, owner_id: null, drive_url: null, canva_url: null, position })
const MOCK: ArtworkItem[] = [
  mk('job-001', 0, 'print', '2×6 strip', 'approved', 3), mk('job-001', 1, 'gif', 'from print frame · one window', 'approved', 2),
  mk('job-001', 2, 'welcome', 'Paid', 'approved', 1), mk('job-001', 3, 'wrap', 'K009 · 5 panels + lightbox', 'sent', 2),
  mk('job-001', 4, 'proof3d', 'front · left 3/4 · right 3/4', 'draft', 1),
  mk('job-002', 0, 'print', '4×6', 'approved', 2), mk('job-002', 1, 'welcome', 'Free', 'approved', 1),
]

// ── Shared cache: one load for the whole board, every card reads from it ────
let cache: ArtworkItem[] | null = null
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

async function load(): Promise<void> {
  if (!isSupabaseConfigured) { cache = MOCK; return }
  const { data, error } = await supabase.from('won_artwork_items').select(COLS).order('position')
  // Table missing (migration not run yet) → just show no artwork.
  if (error) { console.warn('[artwork] load failed', error.message); cache = []; return }
  cache = (data ?? []) as ArtworkItem[]
}

export function refreshArtwork(): void {
  loading = load().then(() => listeners.forEach((l) => l()))
}

/** All artwork items, grouped by job. Loads once and refreshes when the tab regains focus. */
export function useArtwork(): Map<string, ArtworkItem[]> {
  const [, bump] = useState(0)
  useEffect(() => {
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    if (!cache && !loading) refreshArtwork()
    // Coming back from the Designer tab → show the latest status.
    const onFocus = () => refreshArtwork()
    window.addEventListener('focus', onFocus)
    return () => { listeners.delete(l); window.removeEventListener('focus', onFocus) }
  }, [])
  const m = new Map<string, ArtworkItem[]>()
  for (const it of cache ?? []) m.set(it.job_id, [...(m.get(it.job_id) ?? []), it])
  return m
}

export function artworkProgress(items: ArtworkItem[] | undefined): { done: number; total: number } {
  const list = items ?? []
  return { done: list.filter((i) => i.status === 'approved').length, total: list.length }
}
