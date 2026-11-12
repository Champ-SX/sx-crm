/**
 * GET /api/drive-folder?id=<folderId>
 * Lists a PUBLIC ("Anyone with the link") Google Drive folder and its sub-folders
 * (one level down) for the A&F room-kit sync. Reads Google's public embedded
 * folder view — no Google credentials involved. Only drive.google.com is ever
 * fetched, and the id is validated, so this can't be used to reach other hosts.
 */
import { NextRequest, NextResponse } from 'next/server'

export interface DriveEntry { id: string; name: string; folder: boolean; path: string }

const ID_RE = /^[\w-]{20,80}$/

async function list(id: string): Promise<{ id: string; name: string; folder: boolean }[]> {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(res.status === 404 ? 'Folder not found or not shared' : `Drive returned ${res.status}`)
  const html = await res.text()
  const out: { id: string; name: string; folder: boolean }[] = []
  const re = /<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g
  for (const m of html.matchAll(re)) {
    const href = m[1].replace(/&amp;/g, '&')
    const fid = /\/folders\/([\w-]+)/.exec(href)?.[1] ?? /\/d\/([\w-]+)/.exec(href)?.[1] ?? /[?&]id=([\w-]+)/.exec(href)?.[1]
    if (!fid) continue
    const name = m[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim()
    out.push({ id: fid, name, folder: href.includes('/folders/') })
  }
  return out
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'Invalid folder id' }, { status: 400 })
  try {
    const top = await list(id)
    const entries: DriveEntry[] = top.map((e) => ({ ...e, path: '' }))
    const subs = top.filter((e) => e.folder).slice(0, 12)
    const nested = await Promise.all(subs.map(async (f) => (await list(f.id)).map((e) => ({ ...e, path: f.name }))))
    entries.push(...nested.flat())
    return NextResponse.json({ entries })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read folder' }, { status: 502 })
  }
}
