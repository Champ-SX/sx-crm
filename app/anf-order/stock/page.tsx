'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { type AnfStock, type AnfProduct } from '@/types'
import { Boxes, Plus, Trash2, ShoppingCart, Package, MoreHorizontal, Copy, Share2, Check } from 'lucide-react'
import { OrderDialog, type OrderPrefill } from '@/components/anf/order-dialog'
import { ProductPicker } from '@/components/anf/product-picker'
import { ProductDialog } from '@/components/anf/product-dialog'
import { ANF_ACCENT, SEED_BRANCHES, WAREHOUSE, branchColor, fmtDate, statusMeta, CATEGORIES, categoryMeta, orderedCategories, inferCategory } from '@/lib/anf'

const catOf = (r: { category?: string | null; item: string }): string =>
  (r.category || inferCategory(r.item))

type StockState = 'ok' | 'low' | 'out'
function stockState(r: Pick<AnfStock, 'qty' | 'alert_qty'>): StockState {
  if (r.qty <= 0) return 'out'
  if (r.alert_qty != null && r.qty <= r.alert_qty) return 'low'
  return 'ok'
}
function StateFlag({ s }: { s: StockState }) {
  if (s === 'out') return <span className="font-mono text-[9.5px] tracking-wide font-bold px-1.5 py-0.5 rounded bg-[#FF5B3F] text-white">OUT</span>
  if (s === 'low') return <span className="font-mono text-[9.5px] tracking-wide font-bold px-1.5 py-0.5 rounded bg-[#FF5B3F]/15 text-[#FF5B3F]">LOW</span>
  return <span className="font-mono text-[9.5px] tracking-wide font-semibold text-[#3f9d5b]">OK</span>
}

export default function AnfStockPage() {
  const isHydrated = useHydrated()
  const anfStock = useCRMStore((s) => s.anfStock)
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const [tab, setTab] = useState<string>(WAREHOUSE)
  const [lowOnly, setLowOnly] = useState(false)
  const [editing, setEditing] = useState<AnfStock | null>(null)
  const [creating, setCreating] = useState(false)
  const [orderPrefill, setOrderPrefill] = useState<OrderPrefill | null>(null)
  const [transferRow, setTransferRow] = useState<AnfStock | null>(null)
  const [editProductRow, setEditProductRow] = useState<AnfProduct | null>(null)

  const rows = useMemo(
    () => anfStock.filter((r) => !activeBoardId || r.board_id === activeBoardId || !r.board_id),
    [anfStock, activeBoardId],
  )

  // Branch set: seed order first, then any others present.
  const branches = useMemo(() => {
    const present = [...new Set(rows.map((r) => r.branch).filter(Boolean) as string[])]
    const ordered = [...SEED_BRANCHES.filter((b) => present.includes(b)), ...present.filter((b) => !SEED_BRANCHES.includes(b))]
    return ordered
  }, [rows])

  // Last known unit price per item (from orders) — used to prefill ＋Order.
  const lastPrice = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of anfOrders) if (o.item && !m.has(o.item)) m.set(o.item, o.unit_price)
    return m
  }, [anfOrders])
  // Items with an open (not-received) order → shown as "on order".
  const onOrder = useMemo(() => {
    const s = new Set<string>()
    for (const o of anfOrders) if (o.status !== 'received' && o.item) s.add(o.item)
    return s
  }, [anfOrders])

  const lowCount = rows.filter((r) => stockState(r) !== 'ok').length

  function raiseOrder(item: string, branch: string | null, stock_id: string | null) {
    const src = stock_id ? rows.find((r) => r.stock_id === stock_id) : rows.find((r) => r.item === item && r.branch === branch)
    setOrderPrefill({ item, branch, stock_id, unit_price: lastPrice.get(item), description: src?.description ?? null, product_id: src?.product_id ?? null })
  }
  const addAnfStock = useCRMStore((s) => s.addAnfStock)
  function duplicateStock(row: AnfStock) {
    const copy: AnfStock = {
      ...row,
      stock_id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `stk-${Date.now()}`,
      item: `${row.item} - copy`,
    }
    void addAnfStock(copy)
    setEditing(copy)  // reopen on the copy
  }

  // Deep link: /anf-order/stock?item=<id> opens that item's card (Share).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('item')
    if (!id) return
    const found = anfStock.find((r) => r.stock_id === id)
    if (found) { setEditing(found); if (found.branch) setTab(found.branch) }
    // clear the param so it doesn't reopen on later state changes
    window.history.replaceState({}, '', window.location.pathname)
  }, [anfStock])

  if (!isHydrated) return null
  const isTotal = tab === 'TOTAL'
  const isCatalog = tab === 'CATALOG'
  const products = anfProducts.filter((p) => !activeBoardId || p.board_id === activeBoardId || !p.board_id)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><Boxes className="w-2.5 h-2.5 text-white" /></span>
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">ANF Stock</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">{rows.length} items · {lowCount} need reorder</p>
        </div>
        <Button size="sm" className="ml-auto h-9 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> Add item
        </Button>
      </div>

      {/* Tabs — WAREHOUSE first (via SEED order), then branches; TOTAL as an end link */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2 border-b border-border/60">
        {branches.map((b) => <Tab key={b} label={b} color={branchColor(b)} on={tab === b} onClick={() => setTab(b)} />)}
        <button type="button" onClick={() => setTab('TOTAL')} className={`text-[13px] underline underline-offset-4 transition-colors ${isTotal ? 'text-foreground font-semibold' : 'text-[#7A5AA5] hover:opacity-80'}`}>TOTAL ↗</button>
        <button type="button" onClick={() => setTab('CATALOG')} className={`text-[13px] underline underline-offset-4 transition-colors ${isCatalog ? 'text-foreground font-semibold' : 'text-[#7A5AA5] hover:opacity-80'}`}>Catalog ↗</button>
        <span className="flex-1" />
        <button type="button" onClick={() => setLowOnly((v) => !v)} className={`inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 border transition-colors ${lowOnly ? 'bg-[#FF5B3F] text-white border-transparent font-medium' : 'border-border bg-card text-[#FF5B3F] font-semibold hover:bg-muted'}`}>
          ⚠ Low only{lowCount > 0 && ` (${lowCount})`}
        </button>
      </div>
      {/* Hint — TOTAL is a read-only overview */}
      {isTotal && (
        <div className="px-4 sm:px-6 lg:px-8 pt-2.5 -mb-1 text-[12px] text-muted-foreground flex items-start gap-1.5">
          <span className="opacity-70">ⓘ</span>
          <span>Open a branch to add or edit stock.<br /><span className="opacity-80">เปิดสาขาเพื่อเพิ่มหรือแก้ไขสต็อก</span></span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {isCatalog ? (
          <CatalogView products={products} anfStock={anfStock} onEdit={setEditProductRow} />
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No stock yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Add an item or import your stock sheet.</p>
          </div>
        ) : isTotal ? (
          <TotalPivot rows={rows} branches={branches} lowOnly={lowOnly} onOrder={onOrder} onRaise={raiseOrder} />
        ) : (
          <BranchTable rows={rows.filter((r) => r.branch === tab)} branch={tab} lowOnly={lowOnly} onOrder={onOrder} onOpen={setEditing} onRaise={raiseOrder} onTransfer={setTransferRow} />
        )}
      </div>

      {(creating || editing) && <StockDialog key={editing?.stock_id ?? 'new'} row={editing} onClose={() => { setCreating(false); setEditing(null) }} onRaise={raiseOrder} onTransfer={setTransferRow} onDuplicate={duplicateStock} />}
      {orderPrefill && <OrderDialog order={null} prefill={orderPrefill} onClose={() => setOrderPrefill(null)} />}
      {transferRow && <TransferDialog row={transferRow} onClose={() => setTransferRow(null)} />}
      {editProductRow && <ProductDialog product={editProductRow} onClose={() => setEditProductRow(null)} />}
    </div>
  )
}

// ── Catalog view — manage products (SKUs); edit propagates to stock + orders ──
function CatalogView({ products, anfStock, onEdit }: {
  products: AnfProduct[]; anfStock: AnfStock[]; onEdit: (p: AnfProduct) => void
}) {
  if (products.length === 0) return <Empty />
  const groups = orderedCategories([...new Set(products.map((p) => p.category || 'other'))])
    .map((cat) => ({ cat, items: products.filter((p) => (p.category || 'other') === cat).sort((a, b) => a.name.localeCompare(b.name)) }))
  const usedBy = (pid: string) => anfStock.filter((r) => r.product_id === pid).length
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-w-3xl">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Catalog</span>
        <span className="font-mono text-[10px] text-muted-foreground">— {products.length} products</span>
        <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">edit once → updates everywhere</span>
      </div>
      {groups.map(({ cat, items }) => {
        const cm = categoryMeta(cat)
        return (
          <Fragment key={cat}>
            <div className="px-4 py-2 border-l-[3px]" style={{ borderColor: cm.color, backgroundColor: `color-mix(in srgb, ${cm.color} 8%, transparent)` }}>
              <span className="font-semibold text-[13px]">{cm.th}</span>{cm.en && <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground ml-2">{cm.en}</span>}
            </div>
            {items.map((p) => (
              <button key={p.product_id} onClick={() => onEdit(p)} className="w-full flex items-center gap-3 px-4 py-3 border-t border-border/50 text-left hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{p.name}</span>
                  {p.code && <span className="block text-[12px] text-muted-foreground truncate">{p.code}</span>}
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground shrink-0">{usedBy(p.product_id)} loc</span>
                <span className="font-mono text-[10px] text-[#7A5AA5] shrink-0">Edit</span>
              </button>
            ))}
          </Fragment>
        )
      })}
    </div>
  )
}

function Tab({ label, on, onClick, color }: { label: string; on: boolean; onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick} style={color && !on ? { color } : undefined}
      className={`text-[12.5px] font-semibold rounded-full px-3.5 py-1 border transition-colors ${on ? 'bg-foreground text-background border-transparent' : 'border-border bg-card hover:bg-muted'}`}>
      {label}
    </button>
  )
}

// ── By-branch table ─────────────────────────────────────────────────────────
function BranchTable({ rows, branch, lowOnly, onOrder, onOpen, onRaise, onTransfer }: {
  rows: AnfStock[]; branch: string; lowOnly: boolean; onOrder: Set<string>
  onOpen: (r: AnfStock) => void; onRaise: (item: string, branch: string | null, id: string | null) => void
  onTransfer: (r: AnfStock) => void
}) {
  const isWarehouse = branch === WAREHOUSE  // source location — no transfer button
  const list = lowOnly ? rows.filter((r) => stockState(r) !== 'ok') : rows
  if (list.length === 0) return <Empty />
  // Group into category sections (seed order first, custom after).
  const groups = orderedCategories([...new Set(list.map(catOf))]).map((cat) => ({ cat, rows: list.filter((r) => catOf(r) === cat) }))
  return (
    <>
      {/* Desktop — one card, category header bands + a gap between sections */}
      <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm table-fixed">
          <colgroup><col style={{ width: '32%' }} /><col style={{ width: '110px' }} /><col /><col /><col /><col style={{ width: '78px' }} /><col style={{ width: '96px' }} /><col style={{ width: '92px' }} /></colgroup>
          <thead><tr className="border-b border-border">
            {[['Product', 'สินค้า'], ['Room', 'สำหรับห้อง'], ['On hand', 'คงเหลือ'], ['Alert', 'จุดแจ้งเตือน'], ['State', 'สถานะ'], ['Checked', 'ตรวจนับ'], ['Last in', 'รับเข้าล่าสุด'], ['', '']].map(([en, th], i) => (
              <th key={i} className={`px-4 py-3 whitespace-nowrap align-top ${i === 2 || i === 3 ? 'text-right' : 'text-left'}`}>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{en}</span>
                {th && <span className="block text-[10.5px] text-muted-foreground/75 font-normal mt-0.5">{th}</span>}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {groups.map(({ cat, rows: crows }, gi) => {
              const cm = categoryMeta(cat)
              const lowN = crows.filter((r) => stockState(r) !== 'ok').length
              return (
                <Fragment key={cat}>
                  {gi > 0 && <tr aria-hidden><td colSpan={8} className="h-2.5 bg-muted/20" /></tr>}
                  <tr>
                    <td colSpan={8} className="px-4 py-2 border-l-[3px]" style={{ borderColor: cm.color, backgroundColor: `color-mix(in srgb, ${cm.color} 8%, transparent)` }}>
                      <span className="font-semibold text-[13px]">{cm.th}</span>
                      {cm.en && <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground ml-2">{cm.en}</span>}
                      <span className="font-mono text-[10.5px] text-muted-foreground ml-2">— {crows.length}{lowN > 0 && <span className="text-[#FF5B3F] font-semibold"> · {lowN} low</span>}</span>
                    </td>
                  </tr>
                  {crows.map((r) => {
                    const st = stockState(r)
                    return (
                      <tr key={r.stock_id} className="border-t border-border/50 hover:bg-muted/40 cursor-pointer" onClick={() => onOpen(r)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold truncate">{r.item}</span>
                            {!isWarehouse && (
                              <button onClick={(e) => { e.stopPropagation(); onTransfer(r) }} title="Move from warehouse" className="shrink-0 inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wide border border-[#5B6470] text-[#5B6470] rounded-md px-1.5 py-1 hover:bg-[#5B6470]/10"><Package className="w-3 h-3" />WH</button>
                            )}
                          </div>
                          {r.description && <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">{r.description}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground truncate">{r.room || '—'}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${st !== 'ok' ? 'text-[#FF5B3F]' : ''}`}>{r.qty}</td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-muted-foreground whitespace-nowrap">{r.alert_qty ?? '—'}{r.alert_unit ? ` ${r.alert_unit.toLowerCase()}` : ''}</td>
                        <td className="px-4 py-3">{onOrder.has(r.item) && st !== 'ok' ? <span className="font-mono text-[9.5px] uppercase tracking-wide text-[#7A5AA5]">● on order</span> : <StateFlag s={st} />}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{fmtDate(r.checked_at)}{r.checked_by && <span className="block text-[10px]">by {r.checked_by}</span>}</td>
                        <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">{r.delivered_at ? <span className="text-[#3f9d5b]">↓ {fmtDate(r.delivered_at)}{r.sign && <span className="block text-[10px] text-muted-foreground">by {r.sign}</span>}</span> : <span className="text-muted-foreground/40">— never</span>}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {st !== 'ok' && !onOrder.has(r.item) && (
                            <button onClick={() => onRaise(r.item, r.branch, r.stock_id)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide border border-[#7A5AA5] text-[#7A5AA5] rounded-md px-2 py-1 hover:bg-[#7A5AA5]/10 whitespace-nowrap"><ShoppingCart className="w-3 h-3" />Order</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile — a card per category */}
      <div className="md:hidden space-y-4">
        {groups.map(({ cat, rows: crows }) => {
          const cm = categoryMeta(cat)
          return (
            <div key={cat} className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-3 py-2 border-l-[3px] flex items-center gap-2" style={{ borderColor: cm.color, backgroundColor: `color-mix(in srgb, ${cm.color} 8%, transparent)` }}>
                <span className="font-semibold text-[12.5px]">{cm.th}</span>
                {cm.en && <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{cm.en}</span>}
                <span className="font-mono text-[10px] text-muted-foreground ml-auto">{crows.length}</span>
              </div>
              {crows.map((r) => {
                const st = stockState(r)
                return (
                  <div key={r.stock_id} className="px-3 py-3 border-t border-border/50">
                    <button onClick={() => onOpen(r)} className="w-full flex items-start gap-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-[13.5px] leading-tight truncate">{r.item}</span>
                        {r.description && <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{r.description}</span>}
                        <span className="font-mono text-[10px] text-muted-foreground/80 block mt-0.5">{r.room || '—'} · checked {fmtDate(r.checked_at)}{r.checked_by && ` by ${r.checked_by}`}</span>
                        {r.delivered_at && <span className="font-mono text-[10px] text-[#3f9d5b] block mt-0.5">↓ last in {fmtDate(r.delivered_at)}{r.sign && ` · by ${r.sign}`}</span>}
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`font-mono text-[15px] font-bold tabular-nums ${st !== 'ok' ? 'text-[#FF5B3F]' : ''}`}>{r.qty}</span>
                        <span className="block font-mono text-[9px] text-muted-foreground">/ {r.alert_qty ?? '—'} alert</span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2 mt-2">
                      {onOrder.has(r.item) && st !== 'ok' ? <span className="font-mono text-[9.5px] uppercase tracking-wide text-[#7A5AA5]">● on order</span> : <StateFlag s={st} />}
                      <span className="ml-auto flex items-center gap-1.5">
                        {!isWarehouse && (
                          <button onClick={() => onTransfer(r)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide border border-[#5B6470] text-[#5B6470] rounded-md px-2 py-1"><Package className="w-3 h-3" />From WH</button>
                        )}
                        {st !== 'ok' && !onOrder.has(r.item) && (
                          <button onClick={() => onRaise(r.item, r.branch, r.stock_id)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide border border-[#7A5AA5] text-[#7A5AA5] rounded-md px-2 py-1"><ShoppingCart className="w-3 h-3" />Order</button>
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── TOTAL pivot ───────────────────────────────────────────────────────────────
function TotalPivot({ rows, branches, lowOnly, onOrder, onRaise }: {
  rows: AnfStock[]; branches: string[]; lowOnly: boolean; onOrder: Set<string>
  onRaise: (item: string, branch: string | null, id: string | null) => void
}) {
  const items = useMemo(() => {
    const m = new Map<string, { item: string; code: string | null; cat: string; per: Record<string, number | null>; total: number; low: boolean }>()
    for (const r of rows) {
      const key = r.item
      if (!m.has(key)) m.set(key, { item: r.item, code: r.description, cat: catOf(r), per: {}, total: 0, low: false })
      const e = m.get(key)!
      if (!e.code && r.description) e.code = r.description
      const b = r.branch || '—'
      e.per[b] = (e.per[b] ?? 0) + r.qty
      e.total += r.qty
      if (stockState(r) !== 'ok') e.low = true
    }
    return [...m.values()].sort((a, b) => a.item.localeCompare(b.item))
  }, [rows])
  const list = lowOnly ? items.filter((i) => i.total <= 0 || i.low) : items
  if (list.length === 0) return <Empty />
  const state = (i: typeof items[number]): StockState => (i.total <= 0 ? 'out' : i.low ? 'low' : 'ok')
  const cols = branches.length + 4
  const groups = orderedCategories([...new Set(list.map((i) => i.cat))]).map((cat) => ({ cat, items: list.filter((i) => i.cat === cat) }))
  return (
    <div className="border border-border rounded-xl overflow-x-auto bg-card">
      <table className="w-full text-sm min-w-[640px]">
        <thead><tr className="border-b border-border">
          <th className="px-4 py-3 text-left align-top"><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Product</span><span className="block text-[10.5px] text-muted-foreground/75 mt-0.5">สินค้า</span></th>
          {branches.map((b) => <th key={b} className="font-mono text-[10px] uppercase tracking-wider font-semibold px-3 py-3 text-right align-top" style={{ color: branchColor(b) }}>{b}</th>)}
          <th className="px-4 py-3 text-right align-top"><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</span><span className="block text-[10.5px] text-muted-foreground/75 mt-0.5">ยอดรวม</span></th>
          <th className="px-4 py-3 text-left align-top"><span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">State</span><span className="block text-[10.5px] text-muted-foreground/75 mt-0.5">สถานะ</span></th>
          <th className="px-3 py-3" />
        </tr></thead>
        <tbody>
          {groups.map(({ cat, items: citems }, gi) => {
            const cm = categoryMeta(cat)
            return (
              <Fragment key={cat}>
                {gi > 0 && <tr aria-hidden><td colSpan={cols} className="h-2.5 bg-muted/20" /></tr>}
                <tr>
                  <td colSpan={cols} className="px-4 py-2 border-l-[3px]" style={{ borderColor: cm.color, backgroundColor: `color-mix(in srgb, ${cm.color} 8%, transparent)` }}>
                    <span className="font-semibold text-[13px]">{cm.th}</span>
                    {cm.en && <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground ml-2">{cm.en}</span>}
                  </td>
                </tr>
                {citems.map((i) => {
                  const st = state(i)
                  return (
                    <tr key={i.item} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3"><div className="font-semibold">{i.item}</div>{i.code && <div className="text-[12.5px] text-muted-foreground mt-0.5">{i.code}</div>}</td>
                      {branches.map((b) => <td key={b} className="px-3 py-3 text-right font-mono tabular-nums">{i.per[b] == null ? <span className="text-muted-foreground/40">N/A</span> : i.per[b]}</td>)}
                      <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${st !== 'ok' ? 'text-[#FF5B3F]' : ''}`}>{i.total}</td>
                      <td className="px-4 py-3">{onOrder.has(i.item) && st !== 'ok' ? <span className="font-mono text-[9.5px] uppercase tracking-wide text-[#7A5AA5]">● on order</span> : <StateFlag s={st} />}</td>
                      <td className="px-3 py-3 text-right">
                        {st !== 'ok' && !onOrder.has(i.item) && (
                          <button onClick={() => onRaise(i.item, null, null)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide border border-[#7A5AA5] text-[#7A5AA5] rounded-md px-2 py-1 hover:bg-[#7A5AA5]/10 whitespace-nowrap"><ShoppingCart className="w-3 h-3" />Order</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Empty() {
  return <div className="text-center py-16 text-sm text-muted-foreground">Nothing to show here.</div>
}

// ── Transfer from WAREHOUSE → branch (branch +n, warehouse −n) ──────────────────
function TransferDialog({ row, onClose }: { row: AnfStock; onClose: () => void }) {
  const anfStock = useCRMStore((s) => s.anfStock)
  const updateAnfStock = useCRMStore((s) => s.updateAnfStock)
  const wh = anfStock.find((r) => r.item === row.item && r.branch === WAREHOUSE)
  const whQty = wh?.qty ?? 0
  const [qty, setQty] = useState(Math.min(1, whQty))
  const n = Math.max(0, Math.min(qty, whQty))
  const canMove = !!wh && n > 0

  function move() {
    if (!wh || n <= 0) return
    void updateAnfStock(row.stock_id, { qty: row.qty + n })
    void updateAnfStock(wh.stock_id, { qty: wh.qty - n })
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: '#5B6470' }} />
          <DialogTitle className="text-[15px] font-bold">Move to {row.branch}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4">
          <div className="font-medium text-[14px]">{row.item}</div>
          {row.description && <div className="text-[12px] text-muted-foreground mt-0.5">{row.description}</div>}

          {!wh ? (
            <p className="text-[13px] text-muted-foreground mt-4">No WAREHOUSE stock for this item yet — receive an order first.</p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 mt-4 mb-1 text-center">
                <div><div className="field-label mb-0.5">Warehouse</div><div className="font-mono text-[22px] font-bold text-[#5B6470]">{whQty}</div><div className="font-mono text-[10px] text-muted-foreground">→ {whQty - n}</div></div>
                <div className="text-[#7A5AA5] text-xl">↦</div>
                <div><div className="field-label mb-0.5" style={{ color: branchColor(row.branch) }}>{row.branch}</div><div className="font-mono text-[22px] font-bold" style={{ color: branchColor(row.branch) }}>{row.qty}</div><div className="font-mono text-[10px] text-muted-foreground">→ {row.qty + n}</div></div>
              </div>
              <label className="field-label block text-center mt-3">Quantity to move</label>
              <div className="flex items-center justify-center gap-4 mt-1">
                <button type="button" onClick={() => setQty((q) => Math.max(0, q - 1))} className="w-9 h-9 rounded-xl border border-border bg-muted/40 text-xl leading-none flex items-center justify-center hover:bg-muted">−</button>
                <Input type="number" min={0} max={whQty} value={String(n)} onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)} className="w-[70px] h-11 text-center font-mono text-2xl font-bold px-1 text-[#7A5AA5] border-0 shadow-none bg-transparent focus-visible:ring-0 tabular-nums" />
                <button type="button" onClick={() => setQty((q) => Math.min(whQty, q + 1))} className="w-9 h-9 rounded-xl border border-border bg-muted/40 text-xl leading-none flex items-center justify-center hover:bg-muted">+</button>
              </div>
              <p className="text-center font-mono text-[11px] text-muted-foreground mt-2">Warehouse has <b className="text-foreground">{whQty}</b> · can move up to {whQty}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#5B6470] hover:opacity-90 text-white" onClick={move} disabled={!canMove}>Move{canMove ? ` ${n}` : ''}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Stock item editor ─────────────────────────────────────────────────────────
function StockDialog({ row, onClose, onRaise, onTransfer, onDuplicate }: {
  row: AnfStock | null; onClose: () => void
  onRaise: (item: string, branch: string | null, id: string | null) => void
  onTransfer: (r: AnfStock) => void
  onDuplicate: (r: AnfStock) => void
}) {
  const { anfStock, anfOrders, anfProducts, activeBoardId, addAnfStock, updateAnfStock, deleteAnfStock } = useCRMStore()
  const isEdit = !!row
  const [copied, setCopied] = useState(false)
  function share() {
    if (!row) return
    const link = `${window.location.origin}/anf-order/stock?item=${row.stock_id}`
    void navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }
  // Identity comes from the catalog product (read-only here; edit in catalog).
  const [productId, setProductId] = useState<string | null>(row?.product_id ?? null)
  const [item, setItem] = useState(row?.item ?? '')
  const [description, setDescription] = useState(row?.description ?? '')
  const [category, setCategory] = useState<string>(row?.category || inferCategory(row?.item ?? ''))
  const [editProduct, setEditProduct] = useState(false)
  const [branch, setBranch] = useState(row?.branch ?? '')
  const [addingBranch, setAddingBranch] = useState(false)
  const [room, setRoom] = useState(row?.room ?? '')
  const [qty, setQty] = useState(String(row?.qty ?? 0))
  const [alertQty, setAlertQty] = useState(String(row?.alert_qty ?? ''))
  const [alertUnit, setAlertUnit] = useState(row?.alert_unit ?? '')
  const [checkedAt, setCheckedAt] = useState(row?.checked_at ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(row?.notes ?? '')
  // Save-time "who counted" prompt (blank each time) when qty/checked changed.
  const [askChecker, setAskChecker] = useState(false)
  const [checkedBy, setCheckedBy] = useState('')
  const origQty = row?.qty ?? 0
  const origChecked = row?.checked_at ?? ''
  const today = new Date().toISOString().slice(0, 10)
  const recentCheckers = useMemo(
    () => [...new Set(anfStock.map((r) => r.checked_by).filter(Boolean) as string[])].slice(0, 6),
    [anfStock],
  )

  const branchOptions = useMemo(
    () => [...new Set([...SEED_BRANCHES, ...anfStock.map((r) => r.branch).filter(Boolean) as string[], ...(branch ? [branch] : [])])],
    [anfStock, branch],
  )

  // Order history for this item @ this branch (newest first) — traces the loop.
  const history = useMemo(() => {
    if (!row) return []
    return anfOrders
      .filter((o) => o.item === row.item && (o.branch ?? null) === (row.branch ?? null))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 4)
  }, [anfOrders, row])

  const qtyChanged = (parseInt(qty, 10) || 0) !== origQty
  const checkedChanged = (checkedAt || '') !== origChecked

  function save() {
    if (!item.trim()) return
    // A count/check change must record who did it → prompt (blank each time).
    if (qtyChanged || checkedChanged) { setCheckedBy(''); setAskChecker(true); return }
    persist(row?.checked_by ?? null, checkedAt)
  }
  function persist(checkedByVal: string | null, checkedAtVal: string) {
    // Note: `sign` and `delivered_at` are NOT edited here — they're synced from
    // the order receive step (read-only "Last in").
    const base = {
      product_id: productId, item: item.trim(), description: description.trim() || null, category, branch: branch.trim() || null,
      room: room.trim() || null, qty: parseInt(qty, 10) || 0,
      alert_qty: alertQty === '' ? null : (parseInt(alertQty, 10) || 0),
      alert_unit: alertUnit.trim() || null, checked_at: checkedAtVal || null, checked_by: checkedByVal,
      notes: notes.trim() || null,
    }
    if (isEdit && row) void updateAnfStock(row.stock_id, base)
    else void addAnfStock({
      stock_id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `stk-${Date.now()}`,
      board_id: activeBoardId ?? 'anf-order', reported_at: null, delivered_at: null, sign: null, ...base,
    })
    onClose()
  }
  function confirmChecker() {
    // Auto-stamp the checked date to today if the count changed but the date wasn't.
    const finalChecked = checkedChanged ? checkedAt : (qtyChanged ? today : checkedAt)
    persist(checkedBy.trim() || null, finalChecked)
  }
  function remove() {
    if (row && window.confirm(`Delete stock item “${row.item}”?`)) { void deleteAnfStock(row.stock_id); onClose() }
  }

  const editingProduct = anfProducts.find((p) => p.product_id === productId) || null

  return (
    <>
    {editProduct && editingProduct && <ProductDialog product={editingProduct} onClose={() => setEditProduct(false)} />}
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1.5rem)] max-w-xl p-0 gap-0 overflow-hidden">
        {/* Save-time checker prompt — overlays the form */}
        {askChecker && (
          <div className="absolute inset-0 z-20 bg-background/70 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
                <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
                <span className="text-[15px] font-bold">Stock check</span>
              </div>
              <div className="px-5 py-4">
                <p className="text-[14px] font-semibold">Who did this check?</p>
                <p className="text-[12.5px] text-muted-foreground mt-0.5">You updated the count — record who counted it.</p>
                <div className="flex flex-wrap gap-1.5 my-3">
                  {qtyChanged && <span className="font-mono text-[10.5px] border border-border rounded-md px-2 py-1 text-muted-foreground">On hand <b className="text-foreground">{origQty} → {parseInt(qty, 10) || 0}</b></span>}
                  <span className="font-mono text-[10.5px] border border-border rounded-md px-2 py-1 text-muted-foreground">Checked <b className="text-foreground">{fmtDate((checkedChanged ? checkedAt : (qtyChanged ? today : checkedAt)) || null)}</b></span>
                </div>
                <label className="field-label">Checked by</label>
                <Input autoFocus value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} placeholder="name…" className="h-9" onKeyDown={(e) => { if (e.key === 'Enter') confirmChecker() }} />
                {recentCheckers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recentCheckers.map((n) => <button key={n} type="button" onClick={() => setCheckedBy(n)} className="text-[12px] border border-border rounded-full px-2.5 py-1 hover:bg-muted">{n}</button>)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setAskChecker(false)}>Back</Button>
                <Button size="sm" className="ml-auto bg-[#7A5AA5] hover:opacity-90 text-white" onClick={confirmChecker}>Save check</Button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">{isEdit ? 'Edit stock item' : 'Add stock item'}</DialogTitle>
          <div className="ml-auto flex items-center gap-0.5">
            {isEdit && row && (
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="More" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><MoreHorizontal className="w-[18px] h-[18px]" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[170px]">
                  <DropdownMenuItem onClick={() => { onDuplicate(row) }} className="text-sm gap-2.5 cursor-pointer"><Copy className="w-4 h-4" />Duplicate</DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); share() }} className="text-sm gap-2.5 cursor-pointer">{copied ? <><Check className="w-4 h-4 text-[#3f9d5b]" />Link copied</> : <><Share2 className="w-4 h-4" />Share</>}</DropdownMenuItem>
                  <DropdownMenuItem onClick={remove} className="text-sm gap-2.5 cursor-pointer text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-lg leading-none">✕</button>
          </div>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto grid grid-cols-2 gap-3.5">
          {/* Product — pick from catalog; name/code/category come from it (read-only) */}
          <div className="col-span-2 min-w-0">
            <label className="field-label">Product</label>
            <ProductPicker value={productId} boardId={activeBoardId} onSelect={(p) => { setProductId(p.product_id); setItem(p.name); setDescription(p.code ?? ''); setCategory(p.category || 'other') }} />
            {productId && (
              <div className="mt-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: categoryMeta(category).color }} />
                <span className="truncate">{categoryMeta(category).th}{description ? ` · ${description}` : ''}</span>
                <button type="button" onClick={() => setEditProduct(true)} className="ml-auto text-[#7A5AA5] hover:underline shrink-0">Edit product</button>
              </div>
            )}
          </div>

          {/* On hand (75%) — type or −/+ — with Checked (25%) on the right */}
          <div className="col-span-2 flex gap-2.5 items-stretch">
            <div className="flex-[3] min-w-0 rounded-xl border-[1.5px] border-[#FF5B3F]/40 bg-card px-3.5 pt-2.5 pb-3.5 flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">On hand</span>
              <div className="flex items-center justify-center gap-4 mt-1">
                <button type="button" onClick={() => setQty(String(Math.max(0, (parseInt(qty, 10) || 0) - 1)))} className="w-10 h-10 rounded-xl border border-border bg-muted/40 text-2xl leading-none flex items-center justify-center hover:bg-muted shrink-0">−</button>
                <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className="w-[110px] h-14 text-center font-mono !text-[46px] font-extrabold px-1 text-[#FF5B3F] border-0 shadow-none bg-transparent focus-visible:ring-0 tabular-nums" />
                <button type="button" onClick={() => setQty(String((parseInt(qty, 10) || 0) + 1))} className="w-10 h-10 rounded-xl border border-border bg-muted/40 text-2xl leading-none flex items-center justify-center hover:bg-muted shrink-0">+</button>
              </div>
            </div>
            <label className="relative flex-1 min-w-0 rounded-xl border border-border bg-card px-3 py-3 flex flex-col justify-center cursor-pointer hover:bg-muted/40">
              <span className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">Checked</span>
              <span className="font-mono text-[15px] font-bold leading-none mt-2">{checkedAt ? fmtDate(checkedAt) : '—'}</span>
              <span className="font-mono text-[9px] text-muted-foreground mt-1.5">{row?.checked_by ? `by ${row.checked_by}` : 'tap to edit'}</span>
              <input type="date" value={checkedAt} onChange={(e) => setCheckedAt(e.target.value)} onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.() } catch { /* not supported */ } }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Checked date" />
            </label>
          </div>


          <div className="min-w-0">
            <label className="field-label">Branch</label>
            {addingBranch ? (
              <div className="flex items-center gap-1.5">
                <Input autoFocus value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="New branch" className="h-9" />
                <button type="button" onClick={() => setAddingBranch(false)} className="text-[11px] text-muted-foreground shrink-0 px-1">list</button>
              </div>
            ) : (
              <Select value={branch || 'none'} onValueChange={(v) => { if (v === '__add__') { setBranch(''); setAddingBranch(true) } else setBranch(v === 'none' ? '' : (v ?? '')) }}>
                <SelectTrigger className="h-9 w-full"><span className="flex-1 min-w-0 truncate text-left font-semibold" style={branch ? { color: branchColor(branch) } : undefined}>{branch || <span className="font-normal text-muted-foreground">Select branch</span>}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branchOptions.map((b) => <SelectItem key={b} value={b}><span className="font-semibold" style={{ color: branchColor(b) }}>{b}</span></SelectItem>)}
                  <SelectItem value="__add__"><span className="inline-flex items-center gap-2 text-[#7A5AA5]"><Plus className="w-3.5 h-3.5" />Add branch…</span></SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div><label className="field-label">Room / location</label><Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="A63" className="h-9" /></div>

          <div><label className="field-label">Alert threshold</label><Input type="number" min={0} value={alertQty} onChange={(e) => setAlertQty(e.target.value)} placeholder="—" className="h-9" /></div>
          <div><label className="field-label">Alert unit</label><Input value={alertUnit} onChange={(e) => setAlertUnit(e.target.value)} placeholder="boxes" className="h-9" /></div>

          {/* Last in — read-only, synced from the order receive step */}
          {isEdit && (
            <div className="col-span-2 rounded-lg border border-[#3f9d5b]/40 bg-[#3f9d5b]/[0.06] p-3">
              <div className="flex items-center gap-2 mb-2"><span className="field-label mb-0 text-[#3f9d5b]">↓ Last in</span><span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-muted-foreground">read-only · from orders</span></div>
              {row?.delivered_at ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="field-label">Received date</span><div className="font-mono text-[13px] text-[#3f9d5b]">{fmtDate(row.delivered_at)}</div></div>
                  <div><span className="field-label">Received by (sign)</span><div className="text-[13px]">{row.sign || '—'}</div></div>
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">Never received against — marking an order for this item “Received” fills this in.</p>
              )}
            </div>
          )}

          {/* Order history — traces the loop */}
          {isEdit && history.length > 0 && (
            <div className="col-span-2">
              <label className="field-label">Order history · this item @ {row?.branch || 'no branch'}</label>
              <div className="space-y-1.5">
                {history.map((o) => (
                  <div key={o.order_id} className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5 bg-muted/30">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta(o.status).dot}`} />
                    <span className="text-[12px]">{statusMeta(o.status).label}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">{o.status === 'received' ? `+${o.received_qty ?? o.quantity} in${o.received_by ? ` · by ${o.received_by}` : ''}` : `qty ${o.quantity}`}</span>
                    <span className="ml-auto font-mono text-[10.5px] text-muted-foreground whitespace-nowrap">{o.status === 'received' ? fmtDate(o.received_at) : `raised ${fmtDate(o.ordered_at)}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="col-span-2"><label className="field-label">Notes</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm resize-none" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border">
          {isEdit && row && row.branch !== WAREHOUSE && <button onClick={() => { onTransfer(row); onClose() }} className="inline-flex items-center gap-1.5 text-sm text-[#5B6470] border border-[#5B6470] rounded-md px-3 h-9 hover:bg-[#5B6470]/10"><Package className="w-4 h-4" /> From warehouse</button>}
          {isEdit && row && <button onClick={() => { onRaise(row.item, row.branch, row.stock_id); onClose() }} className="inline-flex items-center gap-1.5 text-sm text-[#7A5AA5] border border-[#7A5AA5] rounded-md px-3 h-9 hover:bg-[#7A5AA5]/10"><ShoppingCart className="w-4 h-4" /> Raise order</button>}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save} disabled={!item.trim()}>{isEdit ? 'Save' : 'Add item'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
