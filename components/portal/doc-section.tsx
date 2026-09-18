'use client'

import { useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { type PortalDocument, docUrl } from '@/lib/supabase/portal'

function DocCard({ doc, canEdit, showPills, onEdit }: { doc: PortalDocument; canEdit: boolean; showPills: boolean; onEdit: () => void }) {
  const url = docUrl(doc.file_path)
  async function share() {
    if (!url) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: doc.name, url }); return } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url) } catch { /* blocked */ }
  }
  return (
    <div className="doc-card">
      <div className="doc-head">
        <h3>{doc.name}</h3>
        {showPills && <span className={`pill ${doc.tier}`}>{doc.tier === 'internal' ? 'Internal' : 'Public'}</span>}
      </div>
      <div className="doc-acts">
        <a className="doc-dl" href={url ?? undefined} download={doc.file_name ?? undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!url}>
          <Download className="w-4 h-4" /> ดาวน์โหลด
        </a>
        <button type="button" className="doc-sh" onClick={share}><Share2 className="w-4 h-4" /> แชร์ไฟล์</button>
        {canEdit && <button type="button" className="doc-edit" onClick={onEdit}>Edit</button>}
      </div>
    </div>
  )
}

export function DocsSection({ docs, canEdit, showPills, onAdd, onEdit }: {
  docs: PortalDocument[]; canEdit: boolean; showPills: boolean; onAdd: () => void; onEdit: (d: PortalDocument) => void
}) {
  // Nothing to show a client, and not editable → render nothing at all.
  if (docs.length === 0 && !canEdit) return null
  return (
    <section className="docs">
      <div className="docs-eyebrow">เอกสารบริษัทสำหรับดาวน์โหลด · Company documents</div>
      <div className="docs-grid">
        {docs.map((d) => <DocCard key={d.id} doc={d} canEdit={canEdit} showPills={showPills} onEdit={() => onEdit(d)} />)}
      </div>
      {canEdit && <button type="button" className="add-block docs-add" onClick={onAdd}><span className="plus">+</span> Add document</button>}
    </section>
  )
}
