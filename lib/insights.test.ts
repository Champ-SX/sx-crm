import { describe, it, expect } from 'vitest'
import { upcomingJobs, readinessOf, closingJobs, staleLeads, winRates, lostReasons, daysBetween } from './insights'
import type { Activity, LeadOpportunity, WonJob } from '@/types'

const job = (p: Partial<WonJob>): WonJob => ({ job_id: 'j', op_stage: 'WON_JOB_LIST', event_date: '2026-11-10', staff_list: [], ...p } as WonJob)
const lead = (p: Partial<LeadOpportunity>): LeadOpportunity => ({ lead_op_id: 'l', status: 'open', estimated_value: 0, owner: 'A', service_type: 'LCA', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', ...p } as LeadOpportunity)

describe('insights', () => {
  it('daysBetween counts calendar days', () => { expect(daysBetween('2026-11-01', '2026-11-04')).toBe(3) })

  it('upcomingJobs keeps the next 14 days, not done ones', () => {
    const list = upcomingJobs([job({ job_id: 'a', event_date: '2026-11-03' }), job({ job_id: 'b', event_date: '2026-11-20' }), job({ job_id: 'c', event_date: '2026-11-02', op_stage: 'OP_EVENT_DONE' })], '2026-11-01')
    expect(list.map((j) => j.job_id)).toEqual(['a'])
    expect(list[0].daysLeft).toBe(2)
  })

  it('readiness flags short staff and unpacked / missing equipment', () => {
    const j = job({ staff_needed: 3, staff_list: [{ staff_id: 's' } as never] })
    expect(readinessOf(j, null).missing).toEqual(['staff', 'equipment'])
    expect(readinessOf({ ...j, staff_needed: 1 }, { done: 5, total: 5 }).ready).toBe(true)
    expect(readinessOf({ ...j, staff_needed: 1, is_ops: true }, null).ready).toBe(true)
  })

  it('closingJobs: overdue after 7 days, counts unpaid staff', () => {
    const [c] = closingJobs([job({ event_date: '2026-10-20', op_stage: 'OP_EVENT_DONE', staff_list: [{ paid: true, fee_thb: 1 } as never, { paid: false, fee_thb: 1500 } as never] })], '2026-11-01')
    expect(c.overdue).toBe(true); expect(c.unpaid).toBe(1); expect(c.unpaidThb).toBe(1500)
  })

  it('staleLeads uses the latest activity', () => {
    const acts = [{ entity_type: 'lead_opportunity', entity_id: 'fresh', created_at: '2026-10-30T00:00:00Z' } as Activity]
    const list = staleLeads([lead({ lead_op_id: 'old' }), lead({ lead_op_id: 'fresh' }), lead({ lead_op_id: 'won', status: 'won' })], acts, new Date('2026-11-01T00:00:00Z'))
    expect(list.map((l) => l.lead_op_id)).toEqual(['old'])
  })

  it('winRates hide the rate below 5 closed deals', () => {
    const ls = [...Array(4)].map((_, i) => lead({ lead_op_id: `w${i}`, status: 'won' })).concat(lead({ lead_op_id: 'x', status: 'lost' }), lead({ lead_op_id: 'y', status: 'won', service_type: 'Tally' }))
    const rows = winRates(ls, 'service', '2026-01-01')
    expect(rows.find((r) => r.key === 'LCA')?.rate).toBeCloseTo(0.8)
    expect(rows.find((r) => r.key === 'Tally')?.rate).toBeNull()
  })

  it('lostReasons counts by reason', () => {
    expect(lostReasons([lead({ status: 'lost', lost_reason: 'No reply' }), lead({ status: 'lost', lost_reason: 'No reply' }), lead({ status: 'lost' })])).toEqual([{ reason: 'No reply', n: 2 }])
  })
})
