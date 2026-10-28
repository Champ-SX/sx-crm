import type { AnfOrder, AnfPO, AnfProduct, AnfRequest, AnfRequestEvent } from '@/types'

// Local dev (mock mode) only — made-up sample data for the Requests → POs screens.
// Totals are picked to sit either side of the 10,000 THB approval limit.

const day = (offset: number) => {
  const d = new Date(Date.now() + offset * 86400_000)
  return d.toISOString().slice(0, 10)
}
const ts = (offset: number) => new Date(Date.now() + offset * 86400_000).toISOString()

export const MOCK_REQUESTS: AnfRequest[] = [
  { request_id: 'req-mock-21', number: 'REQ-2026-10-021', project_kind: 'free', project_name: 'Asus booth backdrop', needed_by: day(5), deliver_to: 'Warehouse', created_by: 'Sale A', status: 'pending', total_thb: 24610, submitted_at: ts(-0.1), created_at: ts(0) },
  { request_id: 'req-mock-20', number: 'REQ-2026-10-020', project_kind: 'refill', project_name: 'Refill · Central', needed_by: day(3), deliver_to: 'Central', created_by: 'Ops B', status: 'pending', total_thb: 18190, submitted_at: ts(-1), created_at: ts(-1) },
  { request_id: 'req-mock-19', number: 'REQ-2026-10-019', project_kind: 'free', project_name: 'Acrylic stands', needed_by: day(2), deliver_to: 'Warehouse', created_by: 'Sale A', status: 'approved', total_thb: 4494, approved_by: 'auto', approved_at: ts(-1), created_at: ts(-1) },
  { request_id: 'req-mock-18', number: 'REQ-2026-10-018', project_kind: 'refill', project_name: 'Refill · Siam', needed_by: day(4), deliver_to: 'Siam', created_by: 'Ops B', status: 'approved', total_thb: 2140, approved_by: 'auto', approved_at: ts(-2), created_at: ts(-2) },
  { request_id: 'req-mock-16', number: 'REQ-2026-10-016', project_kind: 'free', project_name: 'Lighting kit', needed_by: day(1), deliver_to: 'Warehouse', created_by: 'Sale C', status: 'approved', total_thb: 15836, approved_by: 'Champ', approved_at: ts(-4), created_at: ts(-4) },
  { request_id: 'req-mock-14', number: 'REQ-2026-10-014', project_kind: 'free', project_name: 'Booth repair', created_by: 'Ops B', status: 'rejected', total_thb: 38520, rejected_reason: 'Repair the old one first', created_at: ts(-6) },
  { request_id: 'req-mock-22', number: 'REQ-2026-10-022', project_kind: 'free', project_name: 'Phuket branch refit', created_by: 'Vitta', status: 'draft', created_at: ts(0) },
]

export const MOCK_POS: AnfPO[] = [
  { po_id: 'po-mock-3', number: 'PO2026100003', supplier_id: 'sup-mock-1', status: 'ordered', created_by: 'Ops B', ordered_at: ts(-1), created_at: ts(-2) },
  { po_id: 'po-mock-4', number: 'PO2026100004', supplier_id: 'sup-mock-2', status: 'ordered', created_by: 'Ops B', ordered_at: ts(-3), created_at: ts(-4) },
  { po_id: 'po-mock-5', number: 'PO2026100005', supplier_id: 'sup-mock-2', status: 'draft', created_by: 'Ops B', created_at: ts(0) },
]

const item = (id: string, request_id: string, name: string, quantity: number, unit_price: number, x: Partial<AnfOrder> = {}): AnfOrder => ({
  order_id: id, request_id, item: name, quantity, unit_price, with_vat: true, branch: null,
  ordered_at: null, needed_by: null, remind_option: 'none', remind_at: null, requested_by: null,
  status: 'to_order', received_at: null, notes: null, created_at: ts(-1), updated_at: ts(-1), ...x,
})

export const MOCK_PURCHASE_ITEMS: AnfOrder[] = [
  // REQ-021 · ฿24,610 incl. VAT → wait for approval
  item('ord-mock-1', 'req-mock-21', 'Backdrop 3×2m print', 1, 8500, { unit: 'pcs', supplier_id: 'sup-mock-2' }),
  item('ord-mock-2', 'req-mock-21', 'LED panel 60W', 2, 7250, { unit: 'pcs', supplier_id: 'sup-mock-2' }),
  // REQ-020 · ฿18,190 → wait for approval
  item('ord-mock-3', 'req-mock-20', 'DNP 4×6 photo paper', 4, 4250, { unit: 'box', supplier_id: 'sup-mock-1', branch: 'Central' }),
  // REQ-019 · ฿4,494 → auto-approved, to order
  item('ord-mock-4', 'req-mock-19', 'Acrylic stand A4', 3, 1400, { unit: 'pcs', supplier_id: 'sup-mock-2' }),
  // REQ-018 · ฿2,140 → ordered on PO-003
  item('ord-mock-5', 'req-mock-18', 'Sleeve 4×6', 10, 200, { unit: 'pack', supplier_id: 'sup-mock-1', branch: 'Siam', status: 'ordered', po_id: 'po-mock-3', ordered_at: day(-1) }),
  // REQ-016 · ฿15,836 → approved by Champ, PO-004, partly received
  item('ord-mock-6', 'req-mock-16', 'Ring light 18"', 2, 4800, { unit: 'pcs', supplier_id: 'sup-mock-2', status: 'received', po_id: 'po-mock-4', ordered_at: day(-3), received_at: day(-1), received_qty: 2, received_by: 'Ops B' }),
  item('ord-mock-7', 'req-mock-16', 'Tripod heavy duty', 2, 2600, { unit: 'pcs', supplier_id: 'sup-mock-2', status: 'ordered', po_id: 'po-mock-4', ordered_at: day(-3) }),
  // REQ-014 · ฿38,520 → rejected example
  item('ord-mock-8', 'req-mock-14', 'Printer DNP DS620', 1, 36000, { unit: 'pcs', supplier_id: 'sup-mock-2' }),
  // REQ-022 · draft, ฿9,630 → submitting it auto-approves (add one more LED strip to go over 10K)
  item('ord-mock-9', 'req-mock-22', 'LED strip 5m', 20, 450, { unit: 'pcs', supplier_id: 'sup-mock-2' }),
  // REQ-016 / PO-004 · an asset: receiving creates CAM-00x units instead of stock
  item('ord-mock-10', 'req-mock-16', 'Camera Canon R50', 2, 24900, { product_id: 'p-mock-cam', unit: 'pcs', supplier_id: 'sup-mock-2', status: 'ordered', po_id: 'po-mock-4', ordered_at: day(-3) }),
]

export const MOCK_ASSET_PRODUCT: AnfProduct = { product_id: 'p-mock-cam', board_id: 'anf-order', name: 'Camera Canon R50', code: 'CAM-R50', category: 'camera', unit: 'pcs', kind: 'asset' }

const ev = (id: string, request_id: string, action: AnfRequestEvent['action'], actor: string, at: number, detail?: string): AnfRequestEvent =>
  ({ id, request_id, action, actor, actor_id: null, at: ts(at), detail: detail ?? null })
export const MOCK_EVENTS: AnfRequestEvent[] = [
  ev('ev-1', 'req-mock-21', 'created', 'Sale A', -0.2),
  ev('ev-2', 'req-mock-21', 'item_added', 'Sale A', -0.2, 'Backdrop 3×2m print ×1'),
  ev('ev-3', 'req-mock-21', 'item_added', 'Sale A', -0.2, 'LED panel 60W ×2'),
  ev('ev-4', 'req-mock-21', 'submitted', 'Sale A', -0.1, '฿24,610 · sent to Champ for approval'),
  ev('ev-5', 'req-mock-16', 'created', 'Sale C', -4.2),
  ev('ev-6', 'req-mock-16', 'submitted', 'Sale C', -4.1, '฿15,836 · sent to Champ for approval'),
  ev('ev-7', 'req-mock-16', 'approved', 'Champ', -4, '฿15,836'),
  ev('ev-8', 'req-mock-16', 'added_to_po', 'Admin', -3.5, 'PO2026100004 · Sample Camera Shop'),
  ev('ev-9', 'req-mock-16', 'ordered', 'Admin', -3, 'PO2026100004'),
  ev('ev-10', 'req-mock-16', 'received', 'Ops B', -1, 'Ring light 18" · 2/2'),
  ev('ev-11', 'req-mock-14', 'submitted', 'Ops B', -6, '฿38,520 · sent to Champ for approval'),
  ev('ev-12', 'req-mock-14', 'rejected', 'Champ', -5.5, 'Repair the old one first'),
]
