import { supabase, isSupabaseConfigured } from './client'
import type { ActivityAttachment } from '@/types'
import type { GraphicKind, GraphicStatus } from './anf-tasks'

// ── Andy & Fine. room kit: graphics (Drive links) + camera / flash presets ────
// Assets belong to a branch + room (room null = whole branch, branch null = all
// branches). Tasks reference them by asset_id. Presets are one per room.
export type AssetKind = GraphicKind | 'camera' | 'flash' | 'source' | 'folder'

export interface AssetVersion {
  version: number; at: string; by: string | null
  url?: string | null; settings?: Record<string, string>; photos?: ActivityAttachment[]
}
export interface AnfAsset {
  asset_id: string
  code: string                     // GA-0412 · CAM-BACC-A64 · FL-BACC-A64
  kind: AssetKind
  branch: string | null
  room: string | null
  name: string
  url: string | null               // Google Drive link (graphics)
  status: GraphicStatus
  version: number
  settings: Record<string, string> // camera / flash preset values
  photos: ActivityAttachment[]     // latest output from the preset
  history: AssetVersion[]
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

export const isPreset = (a: Pick<AnfAsset, 'kind'>) => a.kind === 'camera' || a.kind === 'flash'
/** Frame / GIF / Welcome / Other — the visual assets shown as tiles. */
export const isGraphic = (a: Pick<AnfAsset, 'kind'>) => !isPreset(a) && a.kind !== 'source' && a.kind !== 'folder'

// Field lists (Canon DSLR + mirrorless). Options are suggestions; free text is allowed.
export const CAMERA_FIELDS: { key: string; label: string; options: string[] }[] = [
  { key: 'body', label: 'Body', options: ['EOS R6 Mark II', 'EOS R8', 'EOS R50', 'EOS RP', 'EOS M50 Mark II', 'EOS 5D Mark IV', 'EOS 6D Mark II', 'EOS 90D', 'EOS 850D'] },
  { key: 'lens', label: 'Lens', options: ['RF 24-70mm f/2.8', 'RF 24-105mm f/4', 'RF 35mm f/1.8', 'RF 50mm f/1.8', 'EF 24-70mm f/2.8', 'EF 50mm f/1.8', 'EF-S 18-55mm'] },
  { key: 'focal', label: 'Focal length', options: ['24mm', '28mm', '35mm', '50mm', '70mm', '85mm'] },
  { key: 'mode', label: 'Mode', options: ['M', 'Av', 'Tv', 'P'] },
  { key: 'iso', label: 'ISO', options: ['100', '125', '160', '200', '250', '320', '400', '640', '800', '1600', 'Auto'] },
  { key: 'shutter', label: 'Shutter', options: ['1/60', '1/100', '1/125', '1/160', '1/200', '1/250'] },
  { key: 'aperture', label: 'Aperture', options: ['f/2.8', 'f/4', 'f/5.6', 'f/7.1', 'f/8', 'f/11'] },
  { key: 'wb', label: 'White balance', options: ['5500K', '5200K', '5000K', '4500K', '3200K', 'Auto', 'Daylight', 'Flash', 'Tungsten'] },
  { key: 'style', label: 'Picture style', options: ['Standard', 'Portrait', 'Neutral', 'Faithful', 'Fine detail', 'Auto'] },
  { key: 'focus', label: 'Focus', options: ['One-Shot', 'Servo', 'One-Shot + Face/Eye', 'Manual'] },
  { key: 'quality', label: 'Quality', options: ['JPG L', 'JPG M', 'RAW + JPG L', 'RAW'] },
  { key: 'ratio', label: 'Ratio', options: ['3:2', '4:3', '1:1', '16:9'] },
  { key: 'note', label: 'Note', options: [] },
]
export const FLASH_FIELDS: { key: string; label: string; options: string[] }[] = [
  { key: 'model', label: 'Flash', options: ['Godox AD200 Pro', 'Godox AD300 Pro', 'Godox V1-C', 'Godox TT685II-C', 'Canon 600EX II-RT', 'Canon EL-1'] },
  { key: 'trigger', label: 'Trigger', options: ['Godox X2T-C', 'Godox XPro II-C', 'Canon ST-E3-RT', 'On camera'] },
  { key: 'mode', label: 'Mode', options: ['M', 'TTL', 'Multi'] },
  { key: 'power', label: 'Power', options: ['1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/64', '1/128'] },
  { key: 'fill', label: 'Fill power', options: ['1/16', '1/32', '1/64', '1/128', 'Off'] },
  { key: 'zoom', label: 'Zoom', options: ['24mm', '35mm', '50mm', '70mm', '105mm'] },
  { key: 'sync', label: 'Sync', options: ['1st curtain', '2nd curtain', 'High-speed'] },
  { key: 'key_pos', label: 'Key position', options: ['Left 45°', 'Right 45°', 'Front centre', 'Above camera'] },
  { key: 'modifier', label: 'Modifier', options: ['Octa 90 cm', 'Softbox 60×90', 'Umbrella', 'Beauty dish', 'Bare'] },
  { key: 'channel', label: 'Group / channel', options: [] },
  { key: 'note', label: 'Note', options: [] },
]
export const fieldsFor = (kind: AssetKind) => (kind === 'camera' ? CAMERA_FIELDS : kind === 'flash' ? FLASH_FIELDS : [])

const slug = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9ก-๙]+/g, '')
export function presetCode(kind: 'camera' | 'flash', branch: string | null, room: string | null) {
  return `${kind === 'camera' ? 'CAM' : 'FL'}-${[slug(branch) || 'ALL', slug(room)].filter(Boolean).join('-')}`
}
export function nextGraphicCode(assets: AnfAsset[]) {
  const n = Math.max(0, ...assets.map((a) => Number(/^GA-(\d+)$/.exec(a.code)?.[1] ?? 0)))
  return `GA-${String(n + 1).padStart(4, '0')}`
}
export const assetPlace = (a: Pick<AnfAsset, 'branch' | 'room'>) => [a.branch ?? 'All branches', a.room].filter(Boolean).join(' · ')
/** Codes mentioned in text: GA-0412, CAM-BACC-A64, FL-BACC-A64. */
export const ASSET_CODE_RE = /\b(GA-\d{3,}|CAM-[A-Z0-9ก-๙-]+|FL-[A-Z0-9ก-๙-]+)\b/g

// ── Mock (local dev) ──────────────────────────────────────────────────────────
const nowIso = () => new Date().toISOString()
const mk = (p: Partial<AnfAsset> & Pick<AnfAsset, 'asset_id' | 'code' | 'kind' | 'name'>): AnfAsset => ({
  branch: 'BACC', room: null, url: null, status: 'draft', version: 1, settings: {}, photos: [], history: [],
  created_by: 'Andy', created_at: nowIso(), updated_by: 'Andy', updated_at: nowIso(), ...p,
})
let mockAssets: AnfAsset[] = [
  mk({ asset_id: 'as-1', code: 'GA-0412', kind: 'frame', room: 'A64', name: 'Graduation frame 4×6', url: 'https://drive.google.com/file/d/mock-frame/view', status: 'live', version: 2 }),
  mk({ asset_id: 'as-2', code: 'GA-0413', kind: 'gif', room: 'A64', name: 'Cap toss GIF', url: 'https://drive.google.com/file/d/mock-gif/view' }),
  mk({ asset_id: 'as-3', code: 'GA-0414', kind: 'welcome', room: 'A64', name: 'Welcome 16:9', url: 'https://drive.google.com/file/d/mock-welcome/view', status: 'live' }),
  mk({ asset_id: 'as-4', code: 'GA-0415', kind: 'frame', branch: null, name: 'Basic black frame', url: 'https://drive.google.com/file/d/mock-basic/view', status: 'live' }),
  mk({ asset_id: 'as-5', code: 'CAM-BACC-A64', kind: 'camera', room: 'A64', name: 'Camera preset', status: 'live', version: 3,
    settings: { body: 'EOS R6 Mark II', lens: 'RF 24-70mm f/2.8', focal: '35mm', mode: 'M', iso: '200', shutter: '1/125', aperture: 'f/8', wb: '5500K', style: 'Portrait', focus: 'One-Shot + Face/Eye', quality: 'JPG L', ratio: '3:2', note: 'Exp. comp 0 · 1.6 m from backdrop' } }),
  mk({ asset_id: 'as-6', code: 'FL-BACC-A64', kind: 'flash', room: 'A64', name: 'Flash preset', status: 'live', version: 2,
    settings: { model: 'Godox AD200 Pro', trigger: 'Godox X2T-C', mode: 'M', power: '1/16', fill: '1/64', zoom: '35mm', sync: '1st curtain', key_pos: 'Left 45°', modifier: 'Octa 90 cm', channel: 'A key · B fill · Ch 7' } }),
]

// ── Reads / writes ────────────────────────────────────────────────────────────
export async function fetchAssets(): Promise<AnfAsset[]> {
  if (!isSupabaseConfigured) return mockAssets.map((a) => structuredClone(a))
  const { data, error } = await supabase.from('anf_room_assets').select('*').order('code')
  if (error) throw error
  return (data ?? []) as AnfAsset[]
}
export async function saveAsset(a: AnfAsset): Promise<void> {
  if (!isSupabaseConfigured) { mockAssets = [...mockAssets.filter((x) => x.asset_id !== a.asset_id), a]; return }
  const { error } = await supabase.from('anf_room_assets').upsert(a)
  if (error) throw error
}
export async function deleteAsset(id: string): Promise<void> {
  if (!isSupabaseConfigured) { mockAssets = mockAssets.filter((x) => x.asset_id !== id); return }
  const { error } = await supabase.from('anf_room_assets').delete().eq('asset_id', id)
  if (error) throw error
}

/** A change that bumps the version and keeps the old values in history. */
export function revise(a: AnfAsset, p: Partial<AnfAsset>, by: string): AnfAsset {
  const prev: AssetVersion = { version: a.version, at: a.updated_at, by: a.updated_by, url: a.url, settings: a.settings, photos: a.photos }
  return { ...a, ...p, version: a.version + 1, history: [prev, ...(a.history ?? [])].slice(0, 30), updated_by: by, updated_at: nowIso() }
}
