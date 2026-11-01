import { supabase, isSupabaseConfigured } from './client'

// Invisible history: the date every lead changes status and every Won job
// changes stage. Feeds the funnel / on-time / time-in-stage charts later.
// Fire-and-forget: a failed write never blocks the move itself.

export interface StageChange {
  entity_type: 'lead_opportunity' | 'won_job'
  entity_id: string
  from_stage: string | null
  to_stage: string
  changed_by?: string | null
}

export function logStageChange(c: StageChange): void {
  if (!isSupabaseConfigured || c.from_stage === c.to_stage) return
  const row = { id: crypto.randomUUID(), ...c, changed_by: c.changed_by ?? null, changed_at: new Date().toISOString() }
  void supabase.from('stage_history').insert(row).then(({ error }) => {
    if (error) console.warn('[stage-history] insert failed', error.message)
  })
}
