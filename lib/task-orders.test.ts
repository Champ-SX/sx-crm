import { describe, it, expect } from 'vitest'
import { leadDays, etaFor, stageOf, ordersForTask } from './task-orders'
import type { AnfOrder, AnfPO, AnfRequest } from '@/types'

const req = (p: Partial<AnfRequest> = {}): AnfRequest => ({ request_id: 'r1', number: 'REQ-1', project_kind: 'free', status: 'approved', anf_task_id: 't1', ...p })
const item = (p: Partial<AnfOrder> = {}) => ({ order_id: 'o1', request_id: 'r1', status: 'to_order', po_id: null, ...p }) as AnfOrder
const po = (p: Partial<AnfPO> = {}): AnfPO => ({ po_id: 'p1', number: 'PO1', status: 'ordered', ordered_at: '2026-11-14T03:00:00Z', ...p })
const task = { task_id: 't1', due_date: '2026-11-28', checklists: [{ items: [{ id: 's1', due: '2026-11-22' }] }] }

describe('task orders', () => {
  it('parses lead times', () => {
    expect(leadDays('3–5 days')).toBe(5)
    expect(leadDays('2 weeks')).toBe(14)
    expect(leadDays('ระยะเวลาการผลิต 30-45 วัน')).toBe(45)
    expect(leadDays('')).toBeNull()
  })
  it('ETA = order date + slowest lead time', () => {
    expect(etaFor('2026-11-14T10:00:00Z', ['3–5 days', '7 days', null])).toBe('2026-11-21')
    expect(etaFor('2026-11-14', [null])).toBeNull()
  })
  it('stages', () => {
    expect(stageOf(req({ status: 'pending' }), [item()], [])).toBe(0)
    expect(stageOf(req(), [item()], [])).toBe(1)
    expect(stageOf(req(), [item({ po_id: 'p1' })], [po({ status: 'draft' })])).toBe(2)
    expect(stageOf(req(), [item({ po_id: 'p1', status: 'ordered' })], [po()])).toBe(3)
    expect(stageOf(req(), [item({ status: 'received' })], [])).toBe(4)
  })
  it('late when ETA is after the sub-task due date', () => {
    const ok = ordersForTask(task, [req({ anf_subtask_id: 's1' })], [item({ po_id: 'p1', status: 'ordered' })], [po({ eta: '2026-11-20' })], '2026-11-14')[0]
    expect(ok).toMatchObject({ stage: 3, eta: '2026-11-20', due: '2026-11-22', late: false, orderedAt: '2026-11-14' })
    const late = ordersForTask(task, [req({ anf_subtask_id: 's1' })], [item()], [], '2026-11-20')[0]
    expect(late).toMatchObject({ stage: 1, etaGuess: true, eta: '2026-11-27', late: true })
    const received = ordersForTask(task, [req()], [item({ status: 'received' })], [], '2026-12-30')[0]
    expect(received.late).toBe(false)
  })
})
