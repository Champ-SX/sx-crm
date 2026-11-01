import type { AnfAsset, AnfProduct } from '@/types'
import type { BomLine, RentalProduct } from './bom'
import { MOCK_ASSET_PRODUCT } from './purchasing-mock'

// Local dev only. Product names are the real CAP*TURES range; the BOMs are
// PLACEHOLDERS until the real lists arrive.

const NAMES = ['Popup Studio', 'LCA iPad', 'Photo Moov', 'Story Booth', 'Auto Snap', 'Top View', 'Tally', 'Standard', 'Box Shot', 'AI Booth', 'Newspaper Photo Booth', "What's in my Bag"]
const pid = (n: string) => `rp-${n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}`
export const MOCK_RENTAL_PRODUCTS: RentalProduct[] = NAMES.map((name, position) => ({ product_id: pid(name), name, position }))

let n = 0
const eq = (product: string, label: string, category: string, qty = 1, anf_product_id: string | null = null): BomLine =>
  ({ id: `bl-${++n}`, product_id: pid(product), kind: 'equipment', label, category, anf_product_id, qty, position: n })
const acc = (product: string, label: string, qty = 1): BomLine => ({ id: `bl-${++n}`, product_id: pid(product), kind: 'accessory', label, qty, position: n })
const con = (product: string, label: string, qty: number, unit: string, anf_product_id: string | null = null): BomLine =>
  ({ id: `bl-${++n}`, product_id: pid(product), kind: 'consumable', label, qty, unit, anf_product_id, position: n })

export const MOCK_BOM_LINES: BomLine[] = [
  eq('LCA iPad', 'Tablet', 'tablet'), eq('LCA iPad', 'Printer', 'printer'), eq('LCA iPad', 'Light', 'light', 2),
  eq('LCA iPad', 'Router', 'router'), acc('LCA iPad', 'Ring light stand'), acc('LCA iPad', 'Cable bag'),
  con('LCA iPad', 'DNP 4×6 paper', 2, 'box'),
  eq('Tally', 'Camera', 'camera', 1, 'p-mock-cam'), eq('Tally', 'Printer', 'printer'), eq('Tally', 'Computer', 'computer'),
  acc('Tally', 'Tally cabinet'), con('Tally', 'DNP 4×6 paper', 1, 'box'),
  eq("What's in my Bag", 'Camera', 'camera'), eq("What's in my Bag", 'Tablet', 'tablet'), acc("What's in my Bag", 'Bag props'),
]

export const MOCK_KIT_ASSET_PRODUCTS: AnfProduct[] = [
  MOCK_ASSET_PRODUCT,
  { product_id: 'p-mock-prt', board_id: 'anf-order', name: 'Printer DNP RX1', code: 'DNP-RX1', category: 'printer', unit: 'pcs', kind: 'asset' },
  { product_id: 'p-mock-ipad', board_id: 'anf-order', name: 'iPad Pro 12.9', code: 'IPAD-PRO', category: 'tablet', unit: 'pcs', kind: 'asset' },
  { product_id: 'p-mock-pc', board_id: 'anf-order', name: 'MacBook Air M2', code: 'MBA-M2', category: 'computer', unit: 'pcs', kind: 'asset' },
  { product_id: 'p-mock-lgt', board_id: 'anf-order', name: 'Godox SL60', code: 'SL60', category: 'light', unit: 'pcs', kind: 'asset' },
  { product_id: 'p-mock-rtr', board_id: 'anf-order', name: 'TP-Link Deco', code: 'DECO', category: 'router', unit: 'pcs', kind: 'asset' },
]

const unit = (code: string, product_id: string, slot = 'R1-A'): AnfAsset =>
  ({ asset_id: `ast-mock-${code}`, board_id: 'anf-order', code, product_id, location_kind: 'rack', location_slot: slot, job_id: null })
export const MOCK_KIT_ASSETS: AnfAsset[] = [
  unit('CAM-001', 'p-mock-cam'), unit('CAM-002', 'p-mock-cam', 'R1-B'),
  unit('PRT-001', 'p-mock-prt', 'R2-A'), unit('PRT-002', 'p-mock-prt', 'R2-A'),
  unit('TAB-001', 'p-mock-ipad', 'R1-C'), unit('TAB-002', 'p-mock-ipad', 'R1-C'),
  unit('PC-001', 'p-mock-pc', 'R3-A'),
  unit('LGT-001', 'p-mock-lgt', 'R3-B'), unit('LGT-002', 'p-mock-lgt', 'R3-B'), unit('LGT-003', 'p-mock-lgt', 'R3-B'),
  unit('RTR-001', 'p-mock-rtr', 'R3-C'),
]
