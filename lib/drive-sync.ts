import type { AnfAsset, AssetKind } from '@/lib/supabase/anf-assets'
import { nextGraphicCode, revise } from '@/lib/supabase/anf-assets'

// Room-kit sync from a shared Google Drive folder.
// Expected layout (sub-folder names are matched loosely):
//   <Room folder>/Frame/*.png · GIF/*.gif · Preview/*.png · Welcome|UI/* · .Ai|Source/*.ai
// Each file becomes (or updates) one asset. "Preview Frame-01" is the tile image
// for "Frame-01". "Frame-04FIX" is a newer version of "Frame-04".

export interface DriveEntry { id: string; name: string; folder: boolean; path: string }

export const driveFolderId = (url: string) =>
  /\/folders\/([\w-]{20,})/.exec(url)?.[1] ?? /[?&]id=([\w-]{20,})/.exec(url)?.[1] ?? null
export const driveFileUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`

const ext = (n: string) => (/\.([a-z0-9]+)$/i.exec(n)?.[1] ?? '').toLowerCase()
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov']
const SOURCE = ['ai', 'psd', 'pdf', 'indd', 'fig']
const isFix = (n: string) => /fix/i.test(n.replace(/\.[^.]+$/, ''))

type Role = Exclude<AssetKind, 'camera' | 'flash' | 'folder'> | 'preview'
export function roleOf(e: DriveEntry): Role | null {
  if (e.folder) return null
  const x = ext(e.name), p = e.path.toLowerCase()
  if (SOURCE.includes(x)) return 'source'
  if (!IMAGE.includes(x)) return null                  // .log, .txt … skipped
  if (/preview/.test(p) || /preview/i.test(e.name)) return 'preview'
  if (/gif/.test(p) || x === 'gif') return 'gif'
  if (/welcome|\bui\b|screen/.test(p)) return 'welcome'
  if (/frame/.test(p) || /frame/i.test(e.name)) return 'frame'
  return 'other'
}
/** "Elevator Room - Preview Frame-04FIX.png" → "elevatorroomframe04". */
export const matchKey = (n: string) =>
  n.replace(/\.[^.]+$/, '').toLowerCase().replace(/preview/g, '').replace(/fix/g, '').replace(/[^a-z0-9ก-๙]+/g, '')
const niceName = (n: string) => n.replace(/\.[^.]+$/, '').replace(/\s*fix$/i, '').replace(/\s+-\s+/g, ' · ').trim()

export interface SyncResult { assets: AnfAsset[]; added: number; updated: number; unchanged: number; skipped: string[] }

/** Work out which assets to create / update for one place. Pure. */
export function planSync(entries: DriveEntry[], all: AnfAsset[], place: { branch: string | null; room: string | null }, me: string): SyncResult {
  const now = new Date().toISOString()
  const here = all.filter((a) => (a.branch ?? null) === place.branch && (a.room ?? null) === place.room)
  const previews = new Map<string, string>()
  const groups = new Map<string, { kind: Role; files: DriveEntry[] }>()
  const skipped: string[] = []
  for (const e of entries) {
    const r = roleOf(e)
    if (!r) { if (!e.folder) skipped.push(e.name); continue }
    if (r === 'preview') { previews.set(matchKey(e.name), e.id); continue }
    const k = `${r}:${matchKey(e.name)}`
    const g = groups.get(k) ?? { kind: r, files: [] }
    g.files.push(e); groups.set(k, g)
  }
  const out: AnfAsset[] = []
  let added = 0, updated = 0, unchanged = 0
  let codeBase = all
  for (const [key, g] of groups) {
    // Oldest first: plain file, then FIX file(s).
    const files = [...g.files].sort((a, b) => Number(isFix(a.name)) - Number(isFix(b.name)) || a.name.localeCompare(b.name))
    const current = files[files.length - 1]
    const preview = previews.get(key.split(':')[1]) ?? null
    const existing = here.find((a) => a.settings?.sync_key === key)
    if (!existing) {
      const code = nextGraphicCode(codeBase)
      const history = files.slice(0, -1).map((f, i) => ({ version: i + 1, at: now, by: me, url: driveFileUrl(f.id) }))
      const a: AnfAsset = {
        asset_id: `as-${current.id}`, code, kind: g.kind as AssetKind, branch: place.branch, room: place.room,
        name: niceName(current.name), url: driveFileUrl(current.id), status: 'draft', version: files.length,
        settings: { sync_key: key, drive_id: current.id, ext: ext(current.name), ...(preview ? { preview_id: preview } : {}) },
        photos: [], history: history.reverse(), created_by: me, created_at: now, updated_by: me, updated_at: now,
      }
      out.push(a); codeBase = [...codeBase, a]; added++
      continue
    }
    const sameFile = existing.settings?.drive_id === current.id
    const samePrev = (existing.settings?.preview_id ?? null) === preview
    if (sameFile && samePrev) { unchanged++; continue }
    const settings = { ...existing.settings, drive_id: current.id, ...(preview ? { preview_id: preview } : {}) }
    out.push(sameFile ? { ...existing, settings, updated_by: me, updated_at: now }
      : revise(existing, { url: driveFileUrl(current.id), name: niceName(current.name), settings, status: 'draft' }, me))
    updated++
  }
  return { assets: out, added, updated, unchanged, skipped }
}
