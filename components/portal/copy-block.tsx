'use client'

import { useState } from 'react'
import { Copy, Check, FileText, Truck, Building2, CreditCard, Landmark, Mail } from 'lucide-react'
import { type PortalDetailBlock } from '@/lib/supabase/portal'

const ICONS: Record<string, typeof FileText> = {
  'file-invoice': FileText, 'truck-delivery': Truck, 'building': Building2,
  'credit-card': CreditCard, 'bank': Landmark, 'mail': Mail,
}

export function CopyBtn({ text, className = 'cpbtn', label = 'Copy' }: { text: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false)
  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked */ }
    setDone(true)
    setTimeout(() => setDone(false), 1100)
  }
  return (
    <button type="button" className={`${className}${done ? ' done' : ''}`} onClick={copy} aria-label={label} title={label}>
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function CopyBlock({ block, canEdit, showPills, onEdit }: { block: PortalDetailBlock; canEdit: boolean; showPills: boolean; onEdit: () => void }) {
  const Icon = (block.icon && ICONS[block.icon]) || FileText
  const allText = [block.heading, block.subheading, ...block.lines.map((l) => l.value)].filter(Boolean).join('\n')
  const [allDone, setAllDone] = useState(false)
  async function copyAll() {
    try { await navigator.clipboard.writeText(allText) } catch { /* blocked */ }
    setAllDone(true)
    setTimeout(() => setAllDone(false), 1200)
  }

  return (
    <section className="section dblock">
      <div className="section-head">
        <div className="lead">
          <span className="dblock-ic"><Icon className="w-5 h-5" /></span>
          <div>
            <h2>{block.title}</h2>
            {block.th && <div className="th-title">{block.th}</div>}
          </div>
        </div>
        <div className="dblock-meta">
          {showPills && <span className={`pill ${block.tier}`}><span className="pd" />{block.tier === 'internal' ? 'Internal' : 'Public'}</span>}
          {canEdit && <button className="edit" onClick={onEdit}>Edit</button>}
        </div>
      </div>

      <div className="dblock-body">
        {(block.heading || block.subheading) && (
          <div className="dblock-name">
            {block.heading && <b>{block.heading}</b>}
            {block.subheading && <span>{block.subheading}</span>}
          </div>
        )}
        {block.lines.map((l, i) => (
          <div className="dline" key={i}>
            {l.label && <span className="dlk">{l.label}</span>}
            <span className="dlv">{l.value}</span>
            <CopyBtn text={l.value} label={`Copy ${l.label || 'value'}`} />
          </div>
        ))}
        <button type="button" className={`copyall${allDone ? ' done' : ''}`} onClick={copyAll}>
          {allDone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {allDone ? 'Copied' : 'คัดลอกทั้งหมด · Copy all'}
        </button>
      </div>
    </section>
  )
}
