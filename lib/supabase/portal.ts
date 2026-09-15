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

export const PORTAL_LOGOS_BUCKET = 'portal-logos'

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

// Mutable in-memory copies so the edit UI is exercisable in mock mode.
const mockCompanies = MOCK_COMPANIES.map((c) => ({ ...c }))
let mockResources = MOCK_RESOURCES.map((r) => ({ ...r }))

// ── Reads ──────────────────────────────────────────────────────────────────
export async function fetchPortal(): Promise<{ companies: PortalCompany[]; resources: PortalResource[] }> {
  if (!isSupabaseConfigured) {
    return { companies: mockCompanies.map((c) => ({ ...c })), resources: mockResources.map((r) => ({ ...r })) }
  }
  const [c, r] = await Promise.all([
    supabase.from('portal_companies').select('*').order('sort'),
    supabase.from('portal_resources').select('*').order('sort'),
  ])
  if (c.error) throw c.error
  if (r.error) throw r.error
  return { companies: (c.data ?? []) as PortalCompany[], resources: (r.data ?? []) as PortalResource[] }
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
