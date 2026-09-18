import { supabase, isSupabaseConfigured } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PortalCompany {
  key: string
  name: string
  tag: string | null
  tabmeta: string | null
  tagline: string | null
  logo_path: string | null
  legal_entity: string | null
  established: string | null
  sector: string | null
  hq: string | null
  sort: number
  updated_at?: string
}

export type PortalTier = 'public' | 'internal'

export interface PortalResource {
  id: string
  company: string
  section: string
  tier: PortalTier
  name: string
  type: string | null
  th: string | null
  url: string | null
  owner: string | null
  status: string | null
  sort: number
  updated_at?: string
}

export interface PortalDetailLine { label: string; value: string }
export interface PortalDetailBlock {
  id: string
  company: string
  tier: PortalTier
  title: string
  th: string | null
  icon: string | null
  heading: string | null
  subheading: string | null
  lines: PortalDetailLine[]
  sort: number
  updated_at?: string
}

export interface PortalDocument {
  id: string
  company: string
  tier: PortalTier
  name: string
  file_path: string | null
  file_name: string | null
  sort: number
  updated_at?: string
}

export const PORTAL_LOGOS_BUCKET = 'portal-logos'
export const PORTAL_DOCS_BUCKET = 'portal-docs'

// ── Mock data (local dev / mock mode) — mirrors the seed migration ─────────────
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `pr-${Date.now()}-${Math.random()}`

const MOCK_COMPANIES: PortalCompany[] = [
  { key: 'sixsheet', name: 'SIXSHEET', tag: 'SX', tabmeta: 'Holding', tagline: 'Holding company for the group. Investor-facing brand and shared back-office systems.', logo_path: null, legal_entity: null, established: null, sector: 'Group / Holding', hq: 'Bangkok, TH', sort: 0 },
  { key: 'captures', name: 'CAP*TURES', tag: 'CAP', tabmeta: 'Experience Infra', tagline: 'Experience infrastructure — the photobooth ecosystem. Operator-grade capture systems for live events.', logo_path: null, legal_entity: null, established: null, sector: 'Creative technology', hq: 'Bangkok, TH', sort: 1 },
  { key: 'andyfine', name: 'Andy & Fine.', tag: 'ANF', tabmeta: 'Lifestyle', tagline: 'Lifestyle brand, IG / TikTok-first. Product operations and stock run through shared tooling.', logo_path: null, legal_entity: null, established: null, sector: 'Lifestyle / Retail', hq: 'Bangkok, TH', sort: 2 },
  { key: 'sxtech', name: 'SX TECH', tag: 'SXT', tabmeta: 'R&D / Tech', tagline: 'Experimental technology division. Internal R&D for capture systems, automation and new product bets.', logo_path: null, legal_entity: null, established: null, sector: 'Technology / R&D', hq: 'Bangkok, TH', sort: 3 },
]

const M = (company: string, section: string, tier: PortalTier, name: string, type: string, th: string | null, url: string | null, owner: string, status: string, sort: number): PortalResource =>
  ({ id: uid(), company, section, tier, name, type, th, url, owner, status, sort })

const MOCK_RESOURCES: PortalResource[] = [
  M('sixsheet', 'Brand & Web', 'public', 'Website', 'Website', null, 'https://sixsheet.co', '—', 'active', 0),
  M('sixsheet', 'Brand & Web', 'public', 'Brand & Logo Docs', 'Brand assets', 'เอกสาร บริษัท', null, '—', 'to add', 1),
  M('sixsheet', 'Finance & People', 'internal', 'FlowAccount', 'Accounting', null, 'https://flowaccount.com/', 'Finance', 'active', 0),
  M('sixsheet', 'Finance & People', 'internal', 'Flow HR', 'HR / Payroll', null, null, 'HR', 'to add', 1),
  M('sixsheet', 'Company Docs', 'internal', 'Company Drive', 'Google Drive', null, 'https://drive.google.com/open?id=1gDxri3wSwzWjsmkKPUtrXa3uesqPA-ES&usp=drive_fs', 'Admin', 'active', 0),
  M('captures', 'Brand & Web', 'public', 'Website', 'Website', null, 'https://captures.photo/', '—', 'active', 0),
  M('captures', 'Brand & Web', 'public', 'Brand & Logo Docs', 'Brand assets', 'เอกสาร บริษัท', 'https://bestclus.com/d_cap/#brand-logos', '—', 'active', 1),
  M('captures', 'Operations', 'internal', 'OP · SX-CRM', 'Operations CRM', null, 'https://sx-crm.vercel.app/', 'Ops', 'active', 0),
  M('captures', 'Operations', 'internal', 'Machine No.', 'Fleet spreadsheet', null, 'https://docs.google.com/spreadsheets/d/18-5WuCo_NWQuLJdQrBLRFNhQ4AxUNL9826bpq93tBGk/edit?usp=sharing', 'Ops', 'active', 1),
  M('andyfine', 'Brand & Web', 'public', 'Link Hub', 'Bio / links', null, 'https://lnk.bio/andyandfine', '—', 'active', 0),
  M('andyfine', 'Brand & Web', 'public', 'Brand & Logo Docs', 'Brand assets', 'เอกสาร บริษัท', null, '—', 'to add', 1),
  M('andyfine', 'Operations', 'internal', 'OP · Trello', 'Operation board', null, 'https://trello.com/b/86E0vHTC/%F0%9F%8F%87%F0%9F%8F%BCandy-operation-%F0%9F%8F%87%F0%9F%8F%BC', 'Ops', 'active', 0),
  M('andyfine', 'Operations', 'internal', 'Order & Stock', 'Inventory', null, 'https://sx-crm.vercel.app/anf-order', 'Ops', 'active', 1),
  M('sxtech', 'Brand & Web', 'public', 'Website', 'Website', null, null, '—', 'to add', 0),
  M('sxtech', 'Brand & Web', 'public', 'Brand & Logo Docs', 'Brand assets', 'เอกสาร บริษัท', null, '—', 'to add', 1),
  M('sxtech', 'Operations', 'internal', 'R&D Board', 'Project board', null, null, 'Tech', 'to add', 0),
  M('sxtech', 'Operations', 'internal', 'Code Repository', 'Git / repo', null, null, 'Tech', 'to add', 1),
]

const MOCK_BLOCKS: PortalDetailBlock[] = [
  {
    id: uid(), company: 'sixsheet', tier: 'public', title: 'Document-header address',
    th: 'ที่อยู่ออกหัวเอกสาร · ใบเสนอราคา, ใบกำกับภาษี', icon: 'file-invoice',
    heading: 'บริษัท ซิกซีท กรุ๊ป จำกัด', subheading: 'SIXSHEET GROUP COMPANY LIMITED',
    lines: [
      { label: 'Tax ID · ภาษี', value: '0105559003122' },
      { label: 'Address · ที่อยู่', value: '15 ห้องเลขที่ A124 ซอย ประดิพัทธ์ 17 ถนนประดิพัทธ์ แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400' },
      { label: 'Phone · โทร', value: '080-268-6632' },
    ], sort: 0,
  },
]

const MOCK_DOCUMENTS: PortalDocument[] = [
  { id: uid(), company: 'sixsheet', tier: 'public', name: 'หนังสือรับรองบริษัทล่าสุด 2569', file_path: 'demo/cert.pdf', file_name: 'cert-2569.pdf', sort: 0 },
  { id: uid(), company: 'sixsheet', tier: 'public', name: 'ภ.พ. 20', file_path: 'demo/pp20.pdf', file_name: 'pp20.pdf', sort: 1 },
  { id: uid(), company: 'sixsheet', tier: 'internal', name: 'สมุดบัญชีธนาคาร Bookbank', file_path: 'demo/bookbank.pdf', file_name: 'bookbank.pdf', sort: 2 },
  { id: uid(), company: 'sixsheet', tier: 'internal', name: 'แบบ บอจ. 4', file_path: 'demo/boj4.pdf', file_name: 'boj4.pdf', sort: 3 },
]

// Mutable in-memory copies so the edit UI is exercisable in mock mode.
const mockCompanies = MOCK_COMPANIES.map((c) => ({ ...c }))
let mockResources = MOCK_RESOURCES.map((r) => ({ ...r }))
let mockBlocks = MOCK_BLOCKS.map((b) => ({ ...b }))
let mockDocuments = MOCK_DOCUMENTS.map((d) => ({ ...d }))

// ── Reads ──────────────────────────────────────────────────────────────────
export async function fetchPortal(): Promise<{ companies: PortalCompany[]; resources: PortalResource[]; blocks: PortalDetailBlock[]; documents: PortalDocument[] }> {
  if (!isSupabaseConfigured) {
    return {
      companies: mockCompanies.map((c) => ({ ...c })),
      resources: mockResources.map((r) => ({ ...r })),
      blocks: mockBlocks.map((b) => ({ ...b, lines: b.lines.map((l) => ({ ...l })) })),
      documents: mockDocuments.map((d) => ({ ...d })),
    }
  }
  const [c, r, b, d] = await Promise.all([
    supabase.from('portal_companies').select('*').order('sort'),
    supabase.from('portal_resources').select('*').order('sort'),
    supabase.from('portal_detail_blocks').select('*').order('sort'),
    supabase.from('portal_documents').select('*').order('sort'),
  ])
  if (c.error) throw c.error
  if (r.error) throw r.error
  if (b.error) throw b.error
  if (d.error) throw d.error
  return {
    companies: (c.data ?? []) as PortalCompany[],
    resources: (r.data ?? []) as PortalResource[],
    blocks: (b.data ?? []) as PortalDetailBlock[],
    documents: (d.data ?? []) as PortalDocument[],
  }
}

// ── Company writes ───────────────────────────────────────────────────────────
export async function updateCompany(key: string, patch: Partial<PortalCompany>): Promise<void> {
  if (!isSupabaseConfigured) {
    const i = mockCompanies.findIndex((c) => c.key === key)
    if (i >= 0) mockCompanies[i] = { ...mockCompanies[i], ...patch }
    return
  }
  const { error } = await supabase.from('portal_companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) throw error
}

// ── Resource writes ──────────────────────────────────────────────────────────
export async function createResource(row: Omit<PortalResource, 'id'>): Promise<PortalResource> {
  const record = { ...row }
  if (!isSupabaseConfigured) {
    const created = { ...record, id: uid() } as PortalResource
    mockResources = [...mockResources, created]
    return created
  }
  const { data, error } = await supabase.from('portal_resources').insert(record).select().single()
  if (error) throw error
  return data as PortalResource
}

export async function updateResource(id: string, patch: Partial<PortalResource>): Promise<void> {
  if (!isSupabaseConfigured) {
    mockResources = mockResources.map((r) => r.id === id ? { ...r, ...patch } : r)
    return
  }
  const { error } = await supabase.from('portal_resources').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteResource(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mockResources = mockResources.filter((r) => r.id !== id)
    return
  }
  const { error } = await supabase.from('portal_resources').delete().eq('id', id)
  if (error) throw error
}

// ── Detail block writes ──────────────────────────────────────────────────────
export async function createBlock(row: Omit<PortalDetailBlock, 'id'>): Promise<PortalDetailBlock> {
  if (!isSupabaseConfigured) {
    const created = { ...row, id: uid() } as PortalDetailBlock
    mockBlocks = [...mockBlocks, created]
    return created
  }
  const { data, error } = await supabase.from('portal_detail_blocks').insert(row).select().single()
  if (error) throw error
  return data as PortalDetailBlock
}

export async function updateBlock(id: string, patch: Partial<PortalDetailBlock>): Promise<void> {
  if (!isSupabaseConfigured) {
    mockBlocks = mockBlocks.map((b) => b.id === id ? { ...b, ...patch } : b)
    return
  }
  const { error } = await supabase.from('portal_detail_blocks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteBlock(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mockBlocks = mockBlocks.filter((b) => b.id !== id)
    return
  }
  const { error } = await supabase.from('portal_detail_blocks').delete().eq('id', id)
  if (error) throw error
}

// ── Document writes ──────────────────────────────────────────────────────────
export async function createDocument(row: Omit<PortalDocument, 'id'>): Promise<PortalDocument> {
  if (!isSupabaseConfigured) {
    const created = { ...row, id: uid() } as PortalDocument
    mockDocuments = [...mockDocuments, created]
    return created
  }
  const { data, error } = await supabase.from('portal_documents').insert(row).select().single()
  if (error) throw error
  return data as PortalDocument
}

export async function updateDocument(id: string, patch: Partial<PortalDocument>): Promise<void> {
  if (!isSupabaseConfigured) {
    mockDocuments = mockDocuments.map((d) => d.id === id ? { ...d, ...patch } : d)
    return
  }
  const { error } = await supabase.from('portal_documents').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mockDocuments = mockDocuments.filter((d) => d.id !== id)
    return
  }
  const { error } = await supabase.from('portal_documents').delete().eq('id', id)
  if (error) throw error
}

export async function uploadDoc(companyKey: string, file: File): Promise<{ path: string; fileName: string }> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${companyKey}/${crypto.randomUUID()}-${safe}`
  if (!isSupabaseConfigured) return { path, fileName: file.name }
  const { error } = await supabase.storage.from(PORTAL_DOCS_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw error
  return { path, fileName: file.name }
}

export function docUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (!isSupabaseConfigured) return null
  return supabase.storage.from(PORTAL_DOCS_BUCKET).getPublicUrl(path).data.publicUrl
}

// ── Logo upload ──────────────────────────────────────────────────────────────
export async function uploadLogo(companyKey: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${companyKey}/${crypto.randomUUID()}-${safe}`
  if (!isSupabaseConfigured) return path
  const { error } = await supabase.storage.from(PORTAL_LOGOS_BUCKET).upload(path, file, { contentType: file.type || 'image/png', upsert: false })
  if (error) throw error
  return path
}

export function logoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (!isSupabaseConfigured) return null
  return supabase.storage.from(PORTAL_LOGOS_BUCKET).getPublicUrl(path).data.publicUrl
}
