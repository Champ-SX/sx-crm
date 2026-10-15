'use client'

import { useState } from 'react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The value fields shared by leads and won jobs. */
export interface DealValue {
  estimated_value: number | null
  value_type?: 'fixed' | 'gp_share'
  gp_share_pct?: number | null
  est_gross_sales?: number | null
}

const baht = (n: number) => `฿ ${Math.round(n).toLocaleString()}`
const short = (n: number) => (n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : n >= 1000 ? `฿${Math.round(n / 1000)}K` : `฿${Math.round(n)}`)
const isShare = (d: DealValue) => d.value_type === 'gp_share'

/** Our money: the fixed price, or share % × estimated gross sales. */
export function ourValue(d: DealValue): number {
  if (!isShare(d)) return d.estimated_value ?? 0
  return ((d.gp_share_pct ?? 0) / 100) * (d.est_gross_sales ?? 0)
}

/** Compact text for cards / tables: "฿200K" or "30% GP ≈ ฿54K". */
export function DealValueText({ deal, compact, empty = '—', className }: { deal: DealValue; compact?: boolean; empty?: string; className?: string }) {
  if (isShare(deal)) {
    const v = ourValue(deal)
    return (
      <span className={className}>
        {deal.gp_share_pct ?? 0}% GP{v > 0 && <span className="text-muted-foreground font-normal"> ≈ {compact ? short(v) : baht(v)}</span>}
      </span>
    )
  }
  const v = deal.estimated_value ?? 0
  if (v <= 0) return <span className={cn('text-muted-foreground/60 font-normal', className)}>{empty}</span>
  return <span className={className}>{compact ? short(v) : baht(v)}</span>
}

/** Header field: shows the value + its type; click to edit with a Fixed / % GP share switch. */
export interface DealValuePatch { value_type: 'fixed' | 'gp_share'; estimated_value: number; gp_share_pct: number | null; est_gross_sales: number | null }
export function DealValueField({ deal, onSave }: { deal: DealValue; onSave: (patch: DealValuePatch) => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'fixed' | 'gp_share'>(deal.value_type ?? 'fixed')
  const [amount, setAmount] = useState(deal.value_type === 'gp_share' ? '' : String(deal.estimated_value || ''))
  const [pct, setPct] = useState(deal.gp_share_pct != null ? String(deal.gp_share_pct) : '')
  const [sales, setSales] = useState(deal.est_gross_sales != null ? String(deal.est_gross_sales) : '')
  const num = (s: string) => { const n = parseFloat(s.replace(/,/g, '')); return Number.isFinite(n) ? n : 0 }
  const pctN = Math.min(100, Math.max(0, num(pct)))
  const ours = (pctN / 100) * num(sales)
  const pctError = mode === 'gp_share' && pct !== '' && (num(pct) < 0 || num(pct) > 100)

  function reset() {
    setMode(deal.value_type ?? 'fixed')
    setAmount(deal.value_type === 'gp_share' ? '' : String(deal.estimated_value || ''))
    setPct(deal.gp_share_pct != null ? String(deal.gp_share_pct) : '')
    setSales(deal.est_gross_sales != null ? String(deal.est_gross_sales) : '')
  }
  function save() {
    if (pctError) return
    onSave(mode === 'fixed'
      ? { value_type: 'fixed', estimated_value: num(amount), gp_share_pct: null, est_gross_sales: null }
      : { value_type: 'gp_share', gp_share_pct: pctN, est_gross_sales: sales === '' ? null : num(sales), estimated_value: Math.round(ours) })
    setOpen(false)
  }

  const input = 'h-9 w-full rounded-md border border-border bg-background px-2.5 text-[14px] tabular-nums outline-none focus:border-foreground/40'
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) reset() }}>
      <PopoverTrigger className="group inline-flex items-center gap-1.5 rounded px-2 py-1 -mx-2 hover:bg-muted/50 text-left">
        {isShare(deal) ? (
          <span className="flex flex-col">
            <span className="inline-flex items-center gap-1.5">{deal.gp_share_pct ?? 0}% GP <span className="rounded bg-violet-500/12 px-1.5 py-px text-[10px] font-semibold text-violet-700 dark:text-violet-300">SHARE</span></span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {deal.est_gross_sales ? `≈ ${baht(ourValue(deal))} ours · est. sales ${baht(deal.est_gross_sales)}` : 'est. sales not set'}
            </span>
          </span>
        ) : (
          <span>{(deal.estimated_value ?? 0) > 0 ? baht(deal.estimated_value!) : <span className="text-muted-foreground font-normal">฿ 0</span>}</span>
        )}
        <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">Deal value</span>
          <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Value type">
            {([['fixed', '฿ Fixed'], ['gp_share', '% GP share']] as const).map(([m, l]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={cn('h-7 px-2.5 rounded-md text-[12px] font-medium', mode === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>{l}</button>
            ))}
          </div>
        </div>

        {mode === 'fixed' ? (
          <div className="mt-3">
            <label className="text-[11px] font-medium tracking-wide text-muted-foreground">AMOUNT (฿)</label>
            <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="200,000" className={cn(input, 'mt-1')} />
            <p className="text-[12px] text-muted-foreground mt-1.5">Client pays a fixed price for the job.</p>
          </div>
        ) : (
          <div className="mt-3">
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <div>
                <label className="text-[11px] font-medium tracking-wide text-muted-foreground">OUR SHARE (%)</label>
                <input autoFocus inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="30" className={cn(input, 'mt-1', pctError && 'border-destructive')} />
              </div>
              <div>
                <label className="text-[11px] font-medium tracking-wide text-muted-foreground">EST. GROSS SALES (฿)</label>
                <input inputMode="decimal" value={sales} onChange={(e) => setSales(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="optional" className={cn(input, 'mt-1')} />
              </div>
            </div>
            {pctError && <p className="text-[12px] text-destructive mt-1">Enter a share between 0 and 100%.</p>}
            <div className="rounded-lg bg-muted/60 px-3 py-2 mt-2.5 text-[13px] space-y-0.5 tabular-nums">
              <div className="flex justify-between"><span className="text-muted-foreground">Client ({Math.round((100 - pctN) * 10) / 10}%)</span><span>{baht(num(sales) - ours)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ours ({pctN}%)</span><b>{baht(ours)}</b></div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1.5">Our share of the client&apos;s gross sales. Est. sales feeds pipeline totals — leave blank if unknown (counts ฿0).</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={pctError}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
