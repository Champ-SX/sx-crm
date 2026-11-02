'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { format, parseISO } from 'date-fns'
import { Printer } from 'lucide-react'
import { jobCardName } from '@/lib/jobs'
import { getCosmoInstalls, isTeardown, type CosmoInstall } from '@/lib/supabase/cosmo'
import type { JobKit, JobKitLine } from '@/lib/supabase/bom'
import type { AnfAsset, WonJob } from '@/types'

// Equipment sheet — one A4 page per job, taped to the case. English · Thai labels.
// Rendered into a body-level portal that only shows in @media print.

const PRINT_CSS = `@media screen { .eq-print { display: none !important; } }
@media print {
  @page { size: A4 portrait; margin: 12mm 14mm; }
  body > *:not(.eq-print) { display: none !important; }
  html, body { background: #fff !important; }
  .eq-print { display: block !important; font: 11px/1.45 system-ui, "Noto Sans Thai", sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .eq-print .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; }
  .eq-print .no { font: 700 30px/1 ui-monospace, Menlo, monospace; letter-spacing: -1px; }
  .eq-print .ttl { font-size: 17px; font-weight: 700; margin-top: 4px; }
  .eq-print .sub { color: #666; font-size: 10.5px; }
  .eq-print .k { font-size: 8.5px; letter-spacing: .06em; text-transform: uppercase; color: #666; font-weight: 600; }
  .eq-print .v { font-size: 12.5px; font-weight: 500; }
  .eq-print .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; margin: 10px 0; }
  .eq-print h3 { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; margin: 14px 0 4px; padding-bottom: 3px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; }
  .eq-print h3 em { font-style: normal; color: #666; font-weight: 500; letter-spacing: 0; text-transform: none; }
  .eq-print table { width: 100%; border-collapse: collapse; }
  .eq-print th { font-size: 8.5px; text-transform: uppercase; color: #666; text-align: left; font-weight: 600; padding: 3px 5px; border-bottom: 1px solid #ccc; }
  .eq-print td { padding: 5px; border-bottom: 1px solid #eee; vertical-align: middle; }
  .eq-print tr { break-inside: avoid; }
  .eq-print .prod td { background: #f2f0ec; font-weight: 700; font-size: 12px; }
  .eq-print .box { display: inline-block; width: 12px; height: 12px; border: 1.3px solid #111; border-radius: 2px; }
  .eq-print .mono { font-family: ui-monospace, Menlo, monospace; font-weight: 600; }
  .eq-print .tag { font-size: 8.5px; border: 1px solid #ccc; border-radius: 3px; padding: 0 3px; color: #666; margin-left: 4px; }
  .eq-print .c { text-align: center; }
  .eq-print .two { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .eq-print .note { border: 1px solid #ccc; border-radius: 5px; padding: 6px 8px; min-height: 40px; white-space: pre-wrap; }
  .eq-print .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 26px; break-inside: avoid; }
  .eq-print .sign div { border-top: 1px solid #111; padding-top: 3px; font-size: 9px; color: #666; }
  .eq-print .foot { margin-top: 14px; font-size: 8.5px; color: #666; }
}`

const d = (iso?: string | null, f = 'EEE d MMM') => { try { return iso ? format(parseISO(iso), f) : '' } catch { return '' } }

export function EquipmentPrintButton({ job, kits, lines, assets, done, total, by }: {
  job: WonJob; kits: JobKit[]; lines: JobKitLine[]; assets: AnfAsset[]; done: number; total: number; by: string | null
}) {
  const [sheet, setSheet] = useState<{ cosmo: CosmoInstall[]; qr: string; at: Date } | null>(null)

  async function open() {
    const url = `${window.location.origin}/won-ready-op?open=${encodeURIComponent(job.job_id)}`
    const [rows, qr] = await Promise.all([
      getCosmoInstalls().catch(() => [] as CosmoInstall[]),
      QRCode.toDataURL(url, { margin: 0, width: 160 }).catch(() => ''),
    ])
    const key = String(job.job_number ?? '').replace(/\D/g, '')
    setSheet({ cosmo: key ? rows.filter((r) => String(r.running_number) === key) : [], qr, at: new Date() })
  }

  // Print once the sheet has painted; keep it mounted briefly after (Safari fires afterprint early).
  useEffect(() => {
    if (!sheet) return
    let clear = 0
    const done = () => { clear = window.setTimeout(() => setSheet(null), 1500) }
    const go = window.setTimeout(() => requestAnimationFrame(() => {
      window.addEventListener('afterprint', done, { once: true })
      window.print()
    }), 150)
    return () => { window.clearTimeout(go); window.clearTimeout(clear); window.removeEventListener('afterprint', done) }
  }, [sheet])

  return (
    <>
      <button type="button" onClick={() => void open()} title="Print the equipment sheet (A4)"
        className="h-8 rounded-md border border-border px-2.5 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted"><Printer className="w-3.5 h-3.5" />Print</button>
      {sheet && typeof document !== 'undefined' && createPortal(
        <Sheet job={job} kits={kits} lines={lines} assets={assets} done={done} total={total} by={by} {...sheet} />,
        document.body,
      )}
    </>
  )
}

function Sheet({ job, kits, lines, assets, done, total, by, cosmo, qr, at }: {
  job: WonJob; kits: JobKit[]; lines: JobKitLine[]; assets: AnfAsset[]; done: number; total: number; by: string | null
  cosmo: CosmoInstall[]; qr: string; at: Date
}) {
  const staff = job.staff_list ?? []
  const end = job.event_end_date && job.event_end_date !== job.event_date ? job.event_end_date : null
  const code = (id?: string | null) => (id ? assets.find((a) => a.asset_id === id)?.code : undefined)
  const phases = [...cosmo].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  const contact = [job.onsite_contact_name, job.onsite_contact_phone].filter(Boolean).join(' · ')

  return (
    <div className="eq-print">
      <style>{PRINT_CSS}</style>
      <div className="top">
        <div>
          <div className="no">#{job.job_number ?? '—'}</div>
          <div className="ttl">{job.event_display_name || jobCardName(job)}</div>
          <div className="sub">{[job.company_account?.company_name, job.owner && `Owner: ${job.owner}`].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="k">Event · วันงาน</div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{d(job.event_date) || '—'}</div>
            {end && <div className="sub">ถึง {d(end)}</div>}
          </div>
          {qr && <img src={qr} alt="" style={{ width: 70, height: 70 }} />}
        </div>
      </div>

      <div className="grid">
        <div><div className="k">Venue · สถานที่</div><div className="v">{job.venue || '—'}</div></div>
        <div><div className="k">Onsite contact · ผู้ติดต่อหน้างาน</div><div className="v">{contact || '—'}</div>{job.onsite_line_id && <div className="sub">LINE: {job.onsite_line_id}</div>}</div>
        <div><div className="k">Team meets · เวลานัดทีม</div><div className="v">{job.team_meeting_time || '—'}</div></div>
        <div><div className="k">Event product · สินค้า</div><div className="v">{kits.map((k) => `${k.name}${k.kit_no > 1 ? ` #${k.kit_no}` : ''}`).join(', ') || '—'}</div></div>
      </div>

      <h3>Equipment · อุปกรณ์ <em>จัดแล้ว {done} / {total} ตอนพิมพ์</em></h3>
      <table>
        <thead><tr><th style={{ width: 40 }}>Out · ออก</th><th>Item · รายการ</th><th>Unit / Qty · จำนวน</th><th className="c" style={{ width: 60 }}>Back · คืน</th></tr></thead>
        <tbody>
          {kits.map((k) => (
            <KitRows key={k.id} kit={k} lines={lines.filter((l) => l.kit_id === k.id)} code={code} />
          ))}
        </tbody>
      </table>

      <div className="two">
        <div>
          <h3>Staff · ทีมงาน <em>{staff.length}{job.staff_needed ? ` / ${job.staff_needed}` : ''}</em></h3>
          <table><tbody>
            {staff.length === 0 && <tr><td className="sub">ยังไม่มีทีมงาน</td></tr>}
            {staff.map((s) => <tr key={s.staff_id}><td>{s.nickname ? `${s.nickname} (${s.name})` : s.name}</td><td className="mono">{s.phone}</td></tr>)}
          </tbody></table>
        </div>
        {phases.length > 0 && (
          <div>
            <h3>Setup / Teardown · ติดตั้ง / รื้อถอน <em>Cosmo</em></h3>
            <table><tbody>
              {phases.map((r) => (
                <tr key={`${r.booking_id}-${r.type}`}>
                  <td><b>{isTeardown(r) ? 'Teardown · รื้อ' : 'Setup · ติดตั้ง'}</b> · {d(r.at, 'EEE d MMM HH:mm')}</td>
                  <td>{(r.install_teams ?? []).join(', ')}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </div>

      <h3>Notes · หมายเหตุ</h3>
      <div className="note">{job.inventory_note || ''}</div>

      <div className="sign"><div>Packed by · ผู้จัดของ / วันที่</div><div>Checked out by · ผู้ตรวจก่อนออก / วันที่</div><div>Returned by · ผู้รับคืน / วันที่</div></div>
      <div className="foot">SX-CRM · พิมพ์ {format(at, 'd MMM yyyy HH:mm')}{by ? ` โดย ${by}` : ''}</div>
    </div>
  )
}

function KitRows({ kit, lines, code }: { kit: JobKit; lines: JobKitLine[]; code: (id?: string | null) => string | undefined }) {
  return (
    <>
      <tr className="prod"><td /><td colSpan={3}>{kit.name}{kit.kit_no > 1 ? ` #${kit.kit_no}` : ''}</td></tr>
      {lines.map((l) => {
        const label = l.kind === 'equipment' && l.of_qty > 1 ? `${l.label} ${l.slot}/${l.of_qty}` : l.label
        return (
          <tr key={l.id}>
            <td><span className="box" /></td>
            <td>{label}{l.kind !== 'equipment' && <span className="tag">{l.kind === 'consumable' ? 'Consumable' : 'Accessory'}</span>}{l.optional && <span className="tag">optional</span>}</td>
            <td className={l.kind === 'equipment' ? 'mono' : ''}>{l.kind === 'equipment' ? code(l.asset_id) ?? '________' : `${l.qty}${l.unit ? ` ${l.unit}` : ''}`}</td>
            <td className="c">{l.kind === 'consumable' ? 'ใช้ไป ___' : <span className="box" />}</td>
          </tr>
        )
      })}
    </>
  )
}
