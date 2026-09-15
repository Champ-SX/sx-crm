'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Share2, Copy, Check } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import {
  type PortalCompany, type PortalResource, type PortalTier, type PortalDetailBlock,
  fetchPortal, updateCompany, uploadLogo, logoUrl,
} from '@/lib/supabase/portal'
import { ResourceDialog, type ResourceDraft } from './resource-dialog'
import { ProfileDialog } from './profile-dialog'
import { CopyBlock, CopyBtn } from './copy-block'
import { BlockDialog, type BlockDraft } from './block-dialog'
import { PORTAL_CSS } from './portal-css'

// Per-company accent theme (fill / text-on-fill / accent-as-text on cream).
const THEMES: Record<string, { accent: string; on: string; text: string }> = {
  sixsheet: { accent: '#FF5B3F', on: '#ffffff', text: '#C63E27' },
  captures: { accent: '#DEFF4C', on: '#0A0A0A', text: '#6E8B12' },
  andyfine: { accent: '#FF809E', on: '#0A0A0A', text: '#D6456A' },
  sxtech: { accent: '#0E9AD9', on: '#ffffff', text: '#0A78B4' },
}

const TH_SECTION: Record<string, string> = { 'Brand & Web': 'แบรนด์ & เว็บไซต์', 'Operations': 'ปฏิบัติการ', 'Finance & People': 'การเงิน & บุคคล', 'Company Docs': 'เอกสารบริษัท' }
const SECTION_DESC: Record<string, string> = { 'Brand & Web': 'Client-facing identity and links.', 'Operations': 'Day-to-day run systems and fleet.', 'Finance & People': 'Accounting and HR systems.', 'Company Docs': 'Registration, contracts, shared drive.' }
const SECTION_ORDER = ['Brand & Web', 'Operations', 'Finance & People', 'Company Docs']

const META_FIELDS: { key: keyof PortalCompany; label: string; th: string }[] = [
  { key: 'legal_entity', label: 'Legal entity', th: 'นิติบุคคล' },
  { key: 'established', label: 'Established', th: 'ก่อตั้งเมื่อ' },
  { key: 'sector', label: 'Sector', th: 'ประเภทธุรกิจ' },
  { key: 'hq', label: 'HQ', th: 'สำนักงานใหญ่' },
]

function AstName({ name }: { name: string }) {
  const parts = name.split('*')
  return <>{parts.map((p, i) => <Fragment key={i}>{p}{i < parts.length - 1 && <span className="ast">*</span>}</Fragment>)}</>
}

export function PortalView({ initialCompany }: { initialCompany: string }) {
  const { session } = useAuth()
  const signedIn = !!session
  const [companies, setCompanies] = useState<PortalCompany[]>([])
  const [resources, setResources] = useState<PortalResource[]>([])
  const [blocks, setBlocks] = useState<PortalDetailBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(initialCompany)
  const [mode, setMode] = useState<'public' | 'internal'>('internal')
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null)
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // Default view follows auth: signed-in → internal (all + edit), signed-out → public.
  // Only re-runs when auth actually flips, so a manual Public/Internal toggle sticks.
  useEffect(() => { setMode(signedIn ? 'internal' : 'public') }, [signedIn])

  const reload = useCallback(async () => {
    const { companies, resources, blocks } = await fetchPortal()
    setCompanies(companies.sort((a, b) => a.sort - b.sort))
    setResources(resources)
    setBlocks(blocks)
    setLoading(false)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const company = useMemo(() => companies.find((c) => c.key === active) ?? companies[0], [companies, active])
  const canEdit = signedIn && mode === 'internal'

  function selectCompany(k: string) {
    setActive(k)
    try { window.history.replaceState({}, '', `${window.location.pathname}?company=${k}`) } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading || !company) {
    return (
      <div className="pscope" style={themeVars(active)} data-theme={theme ?? undefined}>
        <style dangerouslySetInnerHTML={{ __html: PORTAL_CSS }} />
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--faint)' }}>Loading portal…</div>
      </div>
    )
  }

  // Group this company's resources by section (seed order, then any extras).
  const byCompany = resources.filter((r) => r.company === company.key)
  const sections = [...new Set(byCompany.map((r) => r.section))]
    .sort((a, b) => (SECTION_ORDER.indexOf(a) + 1 || 99) - (SECTION_ORDER.indexOf(b) + 1 || 99))
    .map((section) => ({
      section,
      tier: (byCompany.find((r) => r.section === section)?.tier ?? 'internal') as PortalTier,
      rows: byCompany.filter((r) => r.section === section).sort((a, b) => a.sort - b.sort),
    }))
    // Public visitors never see internal sections at all.
    .filter((g) => mode === 'internal' || g.tier === 'public')

  const companyBlocks = blocks
    .filter((b) => b.company === company.key && (mode === 'internal' || b.tier === 'public'))
    .sort((a, b) => a.sort - b.sort)

  return (
    <div className="pscope" style={themeVars(active)} data-theme={theme ?? undefined}>
      <style dangerouslySetInnerHTML={{ __html: PORTAL_CSS }} />

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brandmark">
            <span className="dotm" />
            <span className="wm">SIXSHEET</span>
            <span className="sub">Brand CI · Company Portal</span>
          </div>
          <div className="topbar-right">
            {signedIn && (
              <div className="switch" role="group" aria-label="View mode">
                <button data-mode="public" aria-pressed={mode === 'public'} onClick={() => setMode('public')}><span className="dot" />Public</button>
                <button data-mode="internal" aria-pressed={mode === 'internal'} onClick={() => setMode('internal')}><span className="dot" />Internal</button>
              </div>
            )}
            <button className="ghost-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>Theme</button>
          </div>
        </div>
      </div>

      {/* Session strip + company tabs — admin only. The client (public) view is clean. */}
      {mode === 'internal' && (
        <>
          <div className="session">
            <div className="session-inner">
              <span className="chip"><span className="live" /> Signed in via <b>SX‑CRM</b></span>
              <span className="mline">Showing all resources — public + internal</span>
            </div>
          </div>
          <nav className="tabs" aria-label="Companies">
            <div className="tabs-inner">
              {companies.map((c) => (
                <button key={c.key} className="tab" role="tab" aria-selected={c.key === company.key} onClick={() => selectCompany(c.key)}>
                  <span className="tname"><AstName name={c.name} /></span>
                  <span className="tmeta">{c.tabmeta}</span>
                </button>
              ))}
            </div>
          </nav>
        </>
      )}

      {/* Stage */}
      <main className="wrap portal-main">
        {canEdit && <ShareBar company={company.key} name={company.name} />}
        {/* Cover */}
        <section className="cover">
          <div className="cover-grid">
            <div>
              <div className="eyebrow">{company.tag} · Company profile · <span className="th">ข้อมูลบริษัท</span></div>
              <h1><AstName name={company.name} /></h1>
              <p className="tagline">{company.tagline}</p>
              {canEdit && <button className="manage" onClick={() => setProfileOpen(true)}>Manage profile in SX‑CRM ↗</button>}
            </div>
            <div>
              <LogoSlot company={company} canEdit={canEdit} onSaved={reload} />
              <div className="cover-meta">
                {META_FIELDS.map((f) => {
                  const val = company[f.key] as string | null
                  const empty = !val
                  return (
                    <div className="row" key={f.key}>
                      <span className="k">{f.label}<span className="kth">{f.th}</span></span>
                      {empty && canEdit
                        ? <button className="v addv" onClick={() => setProfileOpen(true)}>+ add</button>
                        : <span className={`v ${empty ? 'empty' : ''}`}>{val || '—'}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Copyable detail blocks (document-header address, shipping, bank, …) */}
        {companyBlocks.map((b) => (
          <CopyBlock key={b.id} block={b} canEdit={canEdit} showPills={mode === 'internal'} onEdit={() => setBlockDraft({ block: b, company: company.key })} />
        ))}
        {canEdit && (
          <button className="add-block" onClick={() => setBlockDraft({ company: company.key })}>
            <span className="plus">+</span> Add detail block
          </button>
        )}

        {/* Sections */}
        {sections.map((g, gi) => {
          const rows = mode === 'public' ? g.rows.filter((r) => !!r.url) : g.rows
          return (
            <section className="section" key={g.section}>
              <div className="section-head">
                <div className="lead">
                  <span className="snum">{String(gi + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{g.section}</h2>
                    {TH_SECTION[g.section] && <div className="th-title">{TH_SECTION[g.section]}</div>}
                    <div className="desc">{SECTION_DESC[g.section] ?? ''}</div>
                  </div>
                </div>
                {mode === 'internal' && <span className={`pill ${g.tier}`}><span className="pd" />{g.tier === 'internal' ? 'Internal' : 'Public'}</span>}
              </div>
              <div className="ledger">
                {rows.map((it, i) => (
                  <ResRow key={it.id} it={it} i={i} canEdit={canEdit} showPills={mode === 'internal'}
                    onEdit={() => setResourceDraft({ resource: it, company: company.key, section: it.section, tier: it.tier })} />
                ))}
                {rows.length === 0 && <div className="empty-note">No public links published yet.</div>}
                {canEdit && (
                  <button className="res ghost" onClick={() => setResourceDraft({ company: company.key, section: g.section, tier: g.tier })}>
                    <div className="idx" />
                    <div className="add-line"><span className="plus">+</span> Add resource</div>
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </main>

      {/* How it works */}
      <section className="how">
        <div className="how-card">
          <h3>One template, filled in <em>SX‑CRM</em>, shared two ways.</h3>
          <div className="how-grid">
            <div className="how-cell"><div className="cn">01 — Template</div><h4>Structure fixed, content live</h4><p>Every company inherits the same sections and fields. Team members add resources here — each entry drops into the right section.</p></div>
            <div className="how-cell"><div className="cn">02 — Visibility</div><h4>Each resource is Public or Internal</h4><p>One flag per resource decides who sees it. <code>Public</code> = brand &amp; web, safe for clients. <code>Internal</code> = ops, finance, docs.</p></div>
            <div className="how-cell"><div className="cn">03 — Sharing</div><h4>Two links, one source of truth</h4><p>Send the <b>public link</b> to a client and internal sections never render. Open it signed in and the full stack appears.</p></div>
          </div>
        </div>
      </section>

      <footer>
        <span>SIXSHEET Group · CAP*TURES · Andy &amp; Fine. · SX TECH</span>
        <span>{mode === 'internal' ? 'Internal view' : 'Public view'}</span>
        <span>Brand CI · Portal template v0.2</span>
      </footer>

      {resourceDraft && <ResourceDialog draft={resourceDraft} onClose={() => setResourceDraft(null)} onSaved={() => { setResourceDraft(null); void reload() }} />}
      {blockDraft && <BlockDialog draft={blockDraft} onClose={() => setBlockDraft(null)} onSaved={() => { setBlockDraft(null); void reload() }} />}
      {profileOpen && <ProfileDialog company={company} onClose={() => setProfileOpen(false)} onSaved={() => { setProfileOpen(false); void reload() }} />}
    </div>
  )
}

function ShareBar({ company, name }: { company: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/portal?company=${company}` : `/portal?company=${company}`
  async function copy() {
    try { await navigator.clipboard.writeText(url) } catch { /* clipboard blocked (needs https) */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="sharebar">
      <span className="sb-ic"><Share2 className="w-4 h-4" /></span>
      <div className="sb-u">
        <b>Share public page — {name}</b>
        <code>{url.replace(/^https?:\/\//, '')}</code>
      </div>
      <a className="sb-open" href={`/portal?company=${company}`} target="_blank" rel="noopener noreferrer">Open</a>
      <button type="button" className={`sb-cta${copied ? ' done' : ''}`} onClick={copy}>
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}

function themeVars(key: string): React.CSSProperties {
  const t = THEMES[key] ?? THEMES.sixsheet
  return { '--accent': t.accent, '--on-accent': t.on, '--accent-text': t.text } as React.CSSProperties
}

function ResRow({ it, i, canEdit, showPills, onEdit }: { it: PortalResource; i: number; canEdit: boolean; showPills: boolean; onEdit: () => void }) {
  const hasUrl = !!it.url
  return (
    <div className="res">
      <div className="idx">{String(i + 1).padStart(2, '0')}</div>
      <div className="main">
        <div className="rname"><AstName name={it.name} /></div>
        <div className="rsub">
          <span>{it.type}</span>
          <span className="sep">·</span><span>owner {it.owner || '—'}</span>
          <span className="sep">·</span>
          {it.status === 'to add' ? <span className="empty">awaiting link</span> : <span>{it.status}</span>}
        </div>
        {hasUrl && <div className="rurl"><span className="urltext">{it.url}</span><CopyBtn text={it.url!} className="cpbtn cpsm" label="Copy link" /></div>}
      </div>
      <div className="right">
        {showPills && <span className={`pill ${it.tier}`}><span className="pd" />{it.tier === 'internal' ? 'Internal' : 'Public'}</span>}
        {hasUrl
          ? <a className="open" href={it.url!} target="_blank" rel="noopener noreferrer">Open <span className="arw">→</span></a>
          : canEdit
            ? <button className="open add" onClick={onEdit}>+ Add link</button>
            : <span className="open disabled">Not set</span>}
        {canEdit && <button className="edit" onClick={onEdit}>Edit</button>}
      </div>
    </div>
  )
}

function LogoSlot({ company, canEdit, onSaved }: { company: PortalCompany; canEdit: boolean; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  const url = logoUrl(company.logo_path)
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setBusy(true)
    try {
      const path = await uploadLogo(company.key, file)
      await updateCompany(company.key, { logo_path: path })
      onSaved()
    } finally { setBusy(false) }
  }, [company.key, onSaved])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: false, disabled: !canEdit })

  if (url) {
    return canEdit
      ? <div {...getRootProps()} className="logo-ph" style={{ padding: 0, cursor: 'pointer' }} title="Replace logo"><input {...getInputProps()} /><img src={url} alt={`${company.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      : <div className="logo-ph" style={{ padding: 0 }}><img src={url} alt={`${company.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
  }
  if (canEdit) {
    return (
      <div {...getRootProps()} className="logo-ph" style={{ cursor: 'pointer' }}>
        <input {...getInputProps()} />
        {busy ? 'Uploading…' : isDragActive ? 'Drop image…' : '＋ Add logo'}
      </div>
    )
  }
  return <div className="logo-ph">{company.tag} — Logo</div>
}
