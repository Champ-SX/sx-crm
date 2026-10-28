import { describe, it, expect } from 'vitest'
import type { AnfOrder, AnfRequest } from '@/types'
import { requestTotal, needsApproval, approvalOf, requestStatus, lineRules, receivePlan, neededByAlert, thaiToday, APPROVAL_LIMIT_THB } from './purchasing-rules'

const line = (p: Partial<AnfOrder> = {}): AnfOrder => ({
  order_id: 'o1', item: 'Paper', quantity: 1, unit_price: 100, with_vat: true, branch: null, ordered_at: null, needed_by: null,
  remind_option: 'none', remind_at: null, requested_by: null, status: 'to_order', received_at: null, notes: null,
  created_at: '2026-10-28T00:00:00Z', updated_at: '2026-10-28T00:00:00Z', ...p,
})
const req = (p: Partial<AnfRequest> = {}): AnfRequest => ({ request_id: 'r1', number: 'REQ-1', project_kind: 'free', status: 'draft', ...p })

describe('totals and the approval limit', () => {
  it('adds 7% VAT only to lines marked with VAT', () => {
    expect(requestTotal([line({ quantity: 2, unit_price: 1000 }), line({ quantity: 1, unit_price: 500, with_vat: false })])).toBe(2640)
  })
  it('uses the VAT-inclusive total for the limit (9,800 + VAT = 10,486 needs approval)', () => {
    const total = requestTotal([line({ quantity: 4, unit_price: 2450 })])
    expect(total).toBe(10486)
    expect(needsApproval(total)).toBe(true)
  })
  it('approves under the limit and requires approval at exactly the limit', () => {
    expect(needsApproval(APPROVAL_LIMIT_THB - 1)).toBe(false)
    expect(needsApproval(APPROVAL_LIMIT_THB)).toBe(true)
  })
  it('treats an empty request as 0', () => expect(requestTotal([])).toBe(0))
})

describe('request status', () => {
  it('shows the approval state before anything is ordered', () => {
    expect(requestStatus([line()], req({ status: 'pending' })).status).toBe('pending')
    expect(requestStatus([line()], req({ status: 'rejected' })).status).toBe('rejected')
    expect(requestStatus([line()], req({ status: 'draft' })).status).toBe('draft')
  })
  it('follows the items once approved', () => {
    const r = req({ status: 'approved' })
    expect(requestStatus([line()], r).status).toBe('to_order')
    expect(requestStatus([line({ status: 'ordered', po_id: 'p1' })], r).status).toBe('ordered')
    expect(requestStatus([line({ status: 'received' }), line({ order_id: 'o2', status: 'ordered' })], r).status).toBe('partial')
    expect(requestStatus([line({ status: 'received' })], r).status).toBe('received')
  })
  it('counts requests from before approval existed as approved', () => {
    expect(approvalOf(req({ status: undefined }))).toBe('approved')
    expect(approvalOf(null)).toBe('approved')
  })
})

describe('what can be edited', () => {
  it('draft and rejected lines are fully editable', () => {
    expect(lineRules(req({ status: 'draft' }), line())).toEqual({ editQtyPrice: true, editSupplier: true, remove: true, canAdd: true })
    expect(lineRules(req({ status: 'rejected' }), line()).editQtyPrice).toBe(true)
  })
  it('nothing changes while waiting for approval', () => {
    expect(lineRules(req({ status: 'pending' }), line())).toEqual({ editQtyPrice: false, editSupplier: false, remove: false, canAdd: false })
  })
  it('after approval only the supplier can change, until the line is on a PO', () => {
    const r = req({ status: 'approved' })
    expect(lineRules(r, line())).toEqual({ editQtyPrice: false, editSupplier: true, remove: false, canAdd: false })
    expect(lineRules(r, line({ po_id: 'p1', status: 'ordered' })).editSupplier).toBe(false)
  })
})

describe('receiving', () => {
  const ordered = line({ quantity: 5, status: 'ordered', po_id: 'p1' })
  it('full delivery closes the line', () => {
    const p = receivePlan(ordered, 5, true, () => 'new')
    expect(p.patch).toMatchObject({ status: 'received', received_qty: 5 })
    expect(p.rest).toBeNull()
  })
  it('short delivery + keep rest splits off an open line on the same PO', () => {
    const p = receivePlan(ordered, 3, true, () => 'new')
    expect(p.patch).toMatchObject({ status: 'received', quantity: 3, received_qty: 3 })
    expect(p.rest).toMatchObject({ order_id: 'new', quantity: 2, status: 'ordered', po_id: 'p1', received_qty: null })
  })
  it('short delivery + close short keeps the ordered qty and notes the shortfall', () => {
    const p = receivePlan(ordered, 3, false, () => 'new')
    expect(p.patch.received_qty).toBe(3)
    expect(p.patch.quantity).toBeUndefined()
    expect(p.patch.notes).toContain('Closed short: 3/5')
    expect(p.rest).toBeNull()
  })
  it('never receives more than was ordered', () => {
    expect(receivePlan(ordered, 9, true, () => 'new').patch.received_qty).toBe(5)
  })
})

describe('draft PO', () => {
  it('an item on a draft PO is still "to order"', () => {
    expect(requestStatus([line({ po_id: 'p1', status: 'to_order' })], req({ status: 'approved' })).status).toBe('to_order')
  })
})

describe('needed-by alerts', () => {
  const today = '2026-10-28'
  const ap = (needed_by: string | null) => req({ status: 'approved', needed_by })
  it('warns 3 days before when nothing is ordered yet', () => {
    expect(neededByAlert(ap('2026-10-31'), [line()], today)).toBe('soon')
    expect(neededByAlert(ap('2026-11-01'), [line()], today)).toBeNull()
    expect(neededByAlert(ap('2026-10-28'), [line()], today)).toBe('soon')
  })
  it('does not warn "soon" once everything is ordered', () => {
    expect(neededByAlert(ap('2026-10-30'), [line({ status: 'ordered' })], today)).toBeNull()
  })
  it('is late after the date until everything is received', () => {
    expect(neededByAlert(ap('2026-10-27'), [line({ status: 'ordered' })], today)).toBe('late')
    expect(neededByAlert(ap('2026-10-27'), [line({ status: 'received' })], today)).toBeNull()
  })
  it('ignores drafts, rejected requests and requests without a date', () => {
    expect(neededByAlert(req({ status: 'draft', needed_by: '2026-10-27' }), [line()], today)).toBeNull()
    expect(neededByAlert(req({ status: 'rejected', needed_by: '2026-10-27' }), [line()], today)).toBeNull()
    expect(neededByAlert(ap(null), [line()], today)).toBeNull()
  })
  it('uses Thai calendar days', () => {
    expect(thaiToday(Date.parse('2026-10-28T18:30:00Z'))).toBe('2026-10-29')
  })
})
