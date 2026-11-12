'use client'

import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { checklistProgress, uid, createAnfPlace, updateAnfPlace, deleteAnfPlace, type AnfTask, type AnfTaskType, type AnfPlace, type GraphicKind } from '@/lib/supabase/anf-tasks'
import { isGraphic, isPreset, nextGraphicCode, presetCode, type AnfAsset } from '@/lib/supabase/anf-assets'
import { driveFolderId, planSync, type DriveEntry } from '@/lib/drive-sync'
import { toast } from '@/lib/toast'
import { AssetCard, kindLabel } from './asset-ui'
import { TypePill, typeOf } from './task-ui'

const pill = (on: boolean) => cn('rounded-full px-2.5 py-1 text-[12px] whitespace-nowrap', on ? 'bg-foreground text-background font-semibold' : 'bg-card border border-border text-muted-foreground hover:text-foreground')

type Place = { branch: string | null; room: string | null }
const samePlace = (a: Place, b: Place) => (a.branch ?? null) === (b.branch ?? null) && (a.room ?? null) === (b.room ?? null)

/** Graphic Assets and Camera Setting: pick a branch / room, see its whole kit. */
export function AssetsView({ assets, tasks, places, me, onSave, onDelete, onOpenTask, onPlaces, onPatchTask }: {
  assets: AnfAsset[]; tasks: AnfTask[]; places: AnfPlace[]; me: string
  onSave: (a: AnfAsset) => void; onDelete: (id: string) => void; onOpenTask: (taskId: string) => void
  onPlaces: (p: AnfPlace[]) => void; onPatchTask: (id: string, p: Partial<AnfTask>) => void
}) {
  const [editPlaces, setEditPlaces] = useState(false)
  const fail = (e: unknown) => toast(`Couldn't save — ${e instanceof Error ? e.message : 'error'}`)
  const clean = (v: string | null) => v?.trim() ?? ''
  function renamePlace(kind: 'branch' | 'room', branchName: string, oldName: string, rec?: AnfPlace) {
    const next = clean(window.prompt(`Rename ${kind} “${oldName}” to:`, oldName))
    if (!next || next === oldName) return
    const clash = kind === 'branch' ? places.some((p) => p.kind === 'branch' && p.name === next) : roomsOfName(branchName).includes(next)
    if (clash) { toast(`“${next}” already exists`); return }
    const nA = assets.filter((a) => kind === 'branch' ? a.branch === oldName : a.branch === branchName && a.room === oldName)
    const nT = tasks.filter((t) => kind === 'branch' ? t.branch === oldName : t.branch === branchName && t.room === oldName)
    if (!window.confirm(`Rename “${oldName}” → “${next}”?${nA.length + nT.length ? `\n\nAlso updates ${nA.length} asset(s) and ${nT.length} task(s) that use it.` : ''}`)) return
    if (rec) { onPlaces(places.map((p) => (p.place_id === rec.place_id ? { ...p, name: next } : p))); updateAnfPlace(rec.place_id, { name: next }).catch(fail) }
    nA.forEach((a) => onSave(kind === 'branch' ? { ...a, branch: next } : { ...a, room: next }))
    nT.forEach((t) => onPatchTask(t.task_id, kind === 'branch' ? { branch: next } : { room: next }))
    if (kind === 'branch' ? sel.branch === oldName : sel.branch === branchName && sel.room === oldName) setSel(kind === 'branch' ? { ...sel, branch: next } : { ...sel, room: next })
  }
  function addPlace(kind: 'branch' | 'room', b?: AnfPlace) {
    const name = clean(window.prompt(kind === 'branch' ? 'New branch name:' : `New room in ${b!.name}:`, ''))
    if (!name) return
    if (kind === 'branch' ? places.some((p) => p.kind === 'branch' && p.name === name) : roomsOfName(b!.name).includes(name)) { toast(`“${name}” already exists`); return }
    const rec: AnfPlace = { place_id: uid('pl'), kind, name, branch_id: kind === 'room' ? b!.place_id : null, sort_order: 100 + places.length }
    onPlaces([...places, rec]); createAnfPlace(rec).catch(fail)
    setSel(kind === 'branch' ? { branch: name, room: null } : { branch: b!.name, room: name })
  }
  function removePlace(kind: 'branch' | 'room', branchName: string, name: string, rec?: AnfPlace) {
    const nA = assets.filter((a) => kind === 'branch' ? a.branch === name : a.branch === branchName && a.room === name)
    if (kind === 'branch' && roomsOfName(name).length) { toast(`Remove the rooms in ${name} first`); return }
    const where = kind === 'branch' ? 'All branches' : `${branchName} · Whole branch`
    const kit = nA.filter((a) => isPreset(a) || a.kind === 'folder')      // one per place — can't move
    const move = nA.filter((a) => !kit.includes(a))
    const lines = [
      move.length ? `${move.length} graphic / source file(s) move to “${where}”.` : '',
      kit.length ? `Deleted: ${kit.map((a) => a.kind === 'folder' ? 'Drive folder link' : a.kind === 'camera' ? 'camera preset' : 'flash preset').join(', ')} (the files in Drive are not touched).` : '',
      'Tasks keep their text as it is.',
    ].filter(Boolean).join('\n')
    if (!window.confirm(`Remove ${kind} “${name}”?\n\n${lines}`)) return
    move.forEach((a) => onSave(kind === 'branch' ? { ...a, branch: null, room: null } : { ...a, room: null }))
    kit.forEach((a) => onDelete(a.asset_id))
    if (rec) { onPlaces(places.filter((p) => p.place_id !== rec.place_id)); deleteAnfPlace(rec.place_id).catch(fail) }
    setSel(kind === 'branch' ? { branch: null, room: null } : { branch: branchName, room: null })
  }
  const branches = places.filter((p) => p.kind === 'branch')
  const [sel, setSel] = useState<Place>({ branch: branches[0]?.name ?? null, room: null })
  const [kind, setKind] = useState<GraphicKind | 'all' | 'live'>('all')
  const [adding, setAdding] = useState(false)
  const [nk, setNk] = useState<GraphicKind>('frame')
  const [nName, setNName] = useState('')
  const [nUrl, setNUrl] = useState('')

  const roomsOf = (b: AnfPlace) => [...new Set([
    ...places.filter((p) => p.kind === 'room' && p.branch_id === b.place_id).map((p) => p.name),
    ...assets.filter((a) => a.branch === b.name && a.room).map((a) => a.room!),
  ])]
  const roomsOfName = (bn: string) => { const b = branches.find((x) => x.name === bn); return b ? roomsOf(b) : [...new Set(assets.filter((a) => a.branch === bn && a.room).map((a) => a.room!))] }
  const roomRec = (b: AnfPlace, r: string) => places.find((p) => p.kind === 'room' && p.branch_id === b.place_id && p.name === r)
  const count = (pl: Place) => assets.filter((a) => samePlace(a, pl))
  const here = count(sel)
  const graphics = here.filter(isGraphic).filter((a) => kind === 'all' || (kind === 'live' ? a.status === 'live' : a.kind === kind))
    .sort((a, b) => a.code.localeCompare(b.code))
  const sources = here.filter((a) => a.kind === 'source')
  const folder = here.find((a) => a.kind === 'folder')
  const [folderUrl, setFolderUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  async function sync(url: string) {
    const id = driveFolderId(url)
    if (!id) { toast('Paste a Google Drive folder link'); return }
    setSyncing(true)
    try {
      const res = await fetch(`/api/drive-folder?id=${id}`)
      const j = await res.json() as { entries?: DriveEntry[]; error?: string }
      if (!res.ok || !j.entries) throw new Error(j.error ?? 'Could not read the folder')
      const plan = planSync(j.entries, assets, sel, me)
      plan.assets.forEach(onSave)
      const stamp = new Date().toISOString()
      const sum = `${plan.added} added · ${plan.updated} updated · ${plan.unchanged} unchanged${plan.skipped.length ? ` · skipped ${plan.skipped.join(', ')}` : ''}`
      onSave(folder
        ? { ...folder, url: `https://drive.google.com/drive/folders/${id}`, settings: { ...folder.settings, last_sync: stamp, last_result: sum }, updated_by: me, updated_at: stamp }
        : base({ code: `DIR-${presetCode('camera', sel.branch, sel.room).slice(4)}`, kind: 'folder', name: 'Room folder', url: `https://drive.google.com/drive/folders/${id}`, status: 'live', settings: { last_sync: stamp, last_result: sum } }))
      toast(`Synced · ${sum}`)
      setFolderUrl('')
    } catch (e) { toast(e instanceof Error ? e.message : 'Sync failed') } finally { setSyncing(false) }
  }
  const cam = here.find((a) => a.kind === 'camera')
  const flash = here.find((a) => a.kind === 'flash')
  const usedIn = (a: AnfAsset) => tasks.filter((t) => t.asset_ids?.includes(a.asset_id)).map((t) => ({ id: t.task_id, name: t.name, open: () => onOpenTask(t.task_id) }))
  const now = () => new Date().toISOString()
  const base = (p: Partial<AnfAsset> & Pick<AnfAsset, 'code' | 'kind' | 'name'>): AnfAsset => ({
    asset_id: uid('as'), branch: sel.branch, room: sel.room, url: null, status: 'draft', version: 1, settings: {}, photos: [], history: [],
    created_by: me, created_at: now(), updated_by: me, updated_at: now(), ...p,
  })
  function addGraphic() {
    if (!nName.trim() || !/^https?:\/\//.test(nUrl.trim())) return
    onSave(base({ code: nextGraphicCode(assets), kind: nk, name: nName.trim(), url: nUrl.trim() }))
    setNName(''); setNUrl(''); setAdding(false)
  }
  const placeBtn = (pl: Place, label: string, indent = false) => {
    const n = count(pl)
    const on = samePlace(pl, sel)
    return (
      <button key={`${pl.branch}-${pl.room}`} type="button" onClick={() => setSel(pl)}
        className={cn('flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px]', indent && 'pl-4', on ? 'bg-[#7A5AA5]/12 text-[#7A5AA5] font-semibold' : 'hover:bg-muted')}>
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-[10.5px] text-muted-foreground font-normal">
          {n.filter(isGraphic).length || ''}{n.some((a) => a.kind === 'camera') && ' 📷'}{n.some((a) => a.kind === 'flash') && ' ⚡'}
        </span>
      </button>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Places */}
        <div className="rounded-xl border border-border bg-card p-2 h-fit lg:sticky lg:top-0">
          <select value={JSON.stringify(sel)} onChange={(e) => setSel(JSON.parse(e.target.value))} className="lg:hidden h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]" aria-label="Place">
            {branches.map((b) => [
              <option key={b.place_id} value={JSON.stringify({ branch: b.name, room: null })}>{b.name} · whole branch</option>,
              ...roomsOf(b).map((r) => <option key={b.place_id + r} value={JSON.stringify({ branch: b.name, room: r })}>{b.name} › {r}</option>),
            ])}
            <option value={JSON.stringify({ branch: null, room: null })}>All branches · shared</option>
          </select>
          <div className="hidden lg:block">
            <div className="flex justify-end px-1 pb-1">
              <button type="button" onClick={() => setEditPlaces((v) => !v)} className={cn('rounded-md px-2 py-0.5 text-[11.5px] font-medium', editPlaces ? 'bg-foreground text-background' : 'text-[#7A5AA5] hover:bg-muted')}>{editPlaces ? 'Done' : 'Edit branches & rooms'}</button>
            </div>
            {branches.map((b) => (
              <div key={b.place_id} className="mb-2">
                <div className="group flex items-center gap-1 px-2 pt-1 pb-0.5">
                  <span className="font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">{b.name.toUpperCase()}</span>
                  {editPlaces && <span className="ml-auto flex gap-1.5 text-[11px]">
                    <button type="button" onClick={() => renamePlace('branch', b.name, b.name, b)} className="text-muted-foreground hover:text-foreground">Rename</button>
                    <button type="button" onClick={() => removePlace('branch', b.name, b.name, b)} className="text-muted-foreground hover:text-destructive">Remove</button>
                  </span>}
                </div>
                {placeBtn({ branch: b.name, room: null }, 'Whole branch', true)}
                {roomsOf(b).map((r) => editPlaces ? (
                  <div key={r} className="flex items-center gap-1 rounded-md py-1 pl-4 pr-2 text-[12.5px] hover:bg-muted">
                    <span className="flex-1 truncate">{r}</span>
                    <button type="button" onClick={() => renamePlace('room', b.name, r, roomRec(b, r))} className="text-[11px] text-muted-foreground hover:text-foreground">Rename</button>
                    <button type="button" onClick={() => removePlace('room', b.name, r, roomRec(b, r))} className="text-[11px] text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                ) : placeBtn({ branch: b.name, room: r }, r, true))}
                {editPlaces && <button type="button" onClick={() => addPlace('room', b)} className="w-full rounded-md py-1 pl-4 text-left text-[12px] font-medium text-[#7A5AA5] hover:bg-muted">＋ Add room</button>}
              </div>
            ))}
            {editPlaces && <button type="button" onClick={() => addPlace('branch')} className="mb-2 w-full rounded-md border border-dashed border-border py-1.5 text-[12px] font-medium text-[#7A5AA5] hover:bg-muted">＋ Add branch</button>}
            <div className="px-2 pt-1 pb-0.5 font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">ALL BRANCHES</div>
            {placeBtn({ branch: null, room: null }, 'Shared graphics', true)}
          </div>
        </div>

        {/* The kit */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
            <div className="mr-2"><span className="font-mono text-[12px] text-muted-foreground">{sel.branch ?? 'All branches'}{sel.room && ' ›'}</span> <b className="text-[17px]">{sel.room ?? (sel.branch ? 'Whole branch' : 'Shared')}</b></div>
            {(['all', 'frame', 'gif', 'welcome', 'other', 'live'] as const).map((k) => {
              const n = k === 'all' ? here.filter(isGraphic).length : k === 'live' ? here.filter((a) => isGraphic(a) && a.status === 'live').length : here.filter((a) => a.kind === k).length
              if (k !== 'all' && !n) return null
              return <button key={k} type="button" onClick={() => setKind(k)} className={pill(kind === k)}>{k === 'all' ? 'All' : k === 'live' ? 'Live now' : kindLabel(k)} {n}</button>
            })}
            <button type="button" onClick={() => setAdding((v) => !v)} className="ml-auto rounded-lg bg-[#7A5AA5] px-3 py-1.5 text-[12.5px] font-semibold text-white">＋ Add graphic</button>
          </div>

          {/* Room Drive folder → sync */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[12.5px]">
            <span>📁 <b>Room folder</b></span>
            {folder ? (
              <>
                <a href={folder.url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-[#7A5AA5] hover:underline">Open in Drive ↗</a>
                <span className="text-muted-foreground">{folder.settings.last_result}</span>
                <span className="ml-auto text-muted-foreground">Synced {folder.settings.last_sync ? format(new Date(folder.settings.last_sync), 'd MMM HH:mm') : '—'}</span>
                <button type="button" disabled={syncing} onClick={() => sync(folder.url ?? '')} className="rounded-md bg-foreground px-3 py-1 font-semibold text-background disabled:opacity-50">{syncing ? 'Syncing…' : 'Sync again'}</button>
                <button type="button" disabled={syncing} onClick={() => {
                  const u = window.prompt('New Google Drive folder link for this room:', '')
                  if (!u?.trim()) return
                  if (!driveFolderId(u)) { toast('That is not a Google Drive folder link'); return }
                  if (window.confirm('Switch this room to the new folder and sync now?\n\nAssets already synced stay; files from the new folder are added or updated.')) void sync(u)
                }} className="rounded-md border border-border px-2.5 py-1 hover:bg-muted">Change folder</button>
                <button type="button" disabled={syncing} onClick={() => {
                  if (window.confirm(`Unlink the Drive folder from ${sel.room ?? sel.branch ?? 'this place'}?\n\nSynced assets stay in the CRM — only the folder link is removed.`)) onDelete(folder.asset_id)
                }} className="rounded-md px-2 py-1 text-muted-foreground hover:text-destructive">Unlink</button>
              </>
            ) : (
              <>
                <input value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sync(folderUrl)} placeholder="Paste the room's Google Drive folder link (shared: Anyone with the link)" className="h-8 min-w-[240px] flex-1 rounded-md border border-border bg-background px-2.5" />
                <button type="button" disabled={syncing || !folderUrl.trim()} onClick={() => sync(folderUrl)} className="rounded-md bg-foreground px-3 py-1.5 font-semibold text-background disabled:opacity-40">{syncing ? 'Syncing…' : 'Link & sync'}</button>
              </>
            )}
          </div>

          {adding && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">{(['frame', 'gif', 'welcome', 'other'] as const).map((k) => <button key={k} type="button" onClick={() => setNk(k)} className={pill(nk === k)}>{kindLabel(k)}</button>)}</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Name — e.g. Graduation frame 4×6" className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px]" />
                <input value={nUrl} onChange={(e) => setNUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGraphic()} placeholder="https://drive.google.com/…" className="h-9 rounded-md border border-border bg-background px-2.5 text-[13px]" />
                <button type="button" onClick={addGraphic} disabled={!nName.trim() || !/^https?:\/\//.test(nUrl.trim())} className="h-9 rounded-md bg-foreground px-4 text-[13px] font-semibold text-background disabled:opacity-40">Add</button>
              </div>
              <p className="text-[11.5px] text-muted-foreground">Saved under {sel.branch ?? 'All branches'}{sel.room ? ` › ${sel.room}` : ''}. Google Drive file or folder link.</p>
            </div>
          )}

          <section>
            <div className="mb-2 font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">GRAPHICS · GOOGLE DRIVE</div>
            {graphics.length === 0
              ? <p className="rounded-xl border border-dashed border-border py-6 text-center text-[12.5px] text-muted-foreground">No graphics here yet.</p>
              : <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">{graphics.map((a) => <AssetCard key={a.asset_id} a={a} me={me} onSave={onSave} onDelete={() => onDelete(a.asset_id)} usedIn={usedIn(a)} />)}</div>}
          </section>

          {sources.length > 0 && (
            <section>
              <div className="mb-2 font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">SOURCE FILES</div>
              <div className="space-y-1.5">
                {sources.map((a) => (
                  <a key={a.asset_id} href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] hover:bg-muted/40">
                    <span className="rounded bg-orange-500 px-1.5 py-px font-mono text-[10px] font-bold text-white">{(a.settings?.ext || 'file').toUpperCase().slice(0, 4)}</span>
                    <span className="font-mono text-[10.5px] font-semibold text-[#7A5AA5]">{a.code}</span>{a.name}<span className="ml-auto text-muted-foreground">Open ↗</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {sel.branch && (
            <section className="grid gap-3 xl:grid-cols-2">
              {(['camera', 'flash'] as const).map((k) => {
                const a = k === 'camera' ? cam : flash
                return a
                  ? <AssetCard key={a.asset_id} a={a} me={me} onSave={onSave} onDelete={() => onDelete(a.asset_id)} usedIn={usedIn(a)} />
                  : (
                    <button key={k} type="button" onClick={() => onSave(base({ code: presetCode(k, sel.branch, sel.room), kind: k, name: k === 'camera' ? 'Camera preset' : 'Flash preset', status: 'live' }))}
                      className="rounded-xl border border-dashed border-border py-8 text-[13px] text-muted-foreground hover:text-foreground">
                      {k === 'camera' ? '📷 Set up the camera preset' : '⚡ Set up the flash preset'} for {sel.room ?? sel.branch}
                    </button>
                  )
              })}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

const WEEKS = 8
/** Gantt-style: one row per task, bar from start to due, coloured by type. */
export function TimelineView({ tasks, types, onOpen }: { tasks: AnfTask[]; types: AnfTaskType[]; onOpen: (taskId: string) => void }) {
  const [from, setFrom] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const days = WEEKS * 7
  const to = addDays(from, days - 1)
  const pos = (d: string) => differenceInCalendarDays(parseISO(d + 'T00:00:00'), from)
  const rows = tasks
    .filter((t) => t.due_date || t.start_date)
    .map((t) => {
      const end = t.due_date ?? t.start_date!
      const start = t.start_date && t.start_date <= end ? t.start_date : end
      return { t, start, end }
    })
    .filter((r) => pos(r.end) >= 0 && pos(r.start) < days)
    .sort((a, b) => a.start.localeCompare(b.start))
  const noDate = tasks.filter((t) => !t.due_date && !t.start_date && t.column_id !== 'done')
  const todayX = differenceInCalendarDays(new Date(), from)

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={() => setFrom(addDays(from, -28))} className="h-8 rounded-lg border border-border bg-card px-2.5 text-[12px]">‹ 4 weeks</button>
        <button type="button" onClick={() => setFrom(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="h-8 rounded-lg border border-border bg-card px-3 text-[12px] font-medium">Today</button>
        <button type="button" onClick={() => setFrom(addDays(from, 28))} className="h-8 rounded-lg border border-border bg-card px-2.5 text-[12px]">4 weeks ›</button>
        <span className="text-[14px] font-semibold">{format(from, 'd MMM')} – {format(to, 'd MMM yyyy')}</span>
      </div>
      <div className="min-w-[760px] rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[240px_1fr] border-b border-border">
          <div className="px-3 py-2 font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">TASK</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {Array.from({ length: WEEKS }, (_, i) => <div key={i} className="border-l border-border px-1.5 py-2 font-mono text-[10.5px] text-muted-foreground">{format(addDays(from, i * 7), 'd MMM')}</div>)}
          </div>
        </div>
        {rows.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">No dated tasks in these weeks.</p>}
        {rows.map(({ t, start, end }) => {
          const type = typeOf(types, t.type_id)
          const s = Math.max(0, pos(start)), e = Math.min(days - 1, pos(end))
          const prog = checklistProgress(t)
          const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : null
          const late = t.due_date && t.column_id !== 'done' && pos(t.due_date) < todayX
          return (
            <div key={t.task_id} className="grid grid-cols-[240px_1fr] border-b border-border/60 last:border-0 hover:bg-muted/30">
              <button type="button" onClick={() => onOpen(t.task_id)} className="flex min-w-0 items-center gap-1.5 px-3 py-2 text-left text-[12.5px]">
                <TypePill type={type} /><span className={cn('truncate', t.column_id === 'done' && 'text-muted-foreground line-through')}>{t.name}</span>
              </button>
              <div className="relative h-10" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(100% / ${WEEKS} - 1px), var(--border) calc(100% / ${WEEKS} - 1px) calc(100% / ${WEEKS}))` }}>
                {todayX >= 0 && todayX < days && <span className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: `${((todayX + 0.5) / days) * 100}%` }} />}
                <button type="button" onClick={() => onOpen(t.task_id)}
                  className={cn('absolute top-2 h-6 rounded-md px-1.5 text-left text-[11px] font-semibold text-white overflow-hidden whitespace-nowrap', t.column_id === 'done' && 'opacity-50', late && 'ring-2 ring-red-500')}
                  style={{ left: `${(s / days) * 100}%`, width: `max(${((e - s + 1) / days) * 100}%, 22px)`, backgroundColor: type?.color ?? '#888' }}
                  title={`${t.name} · ${format(parseISO(start + 'T00:00:00'), 'd MMM')} → ${format(parseISO(end + 'T00:00:00'), 'd MMM')}${pct !== null ? ` · ${pct}%` : ''}`}>
                  {pct !== null && <span className="absolute inset-y-0 left-0 bg-black/15" style={{ width: `${pct}%` }} />}
                  <span className="relative">{pct !== null ? `${pct}%` : ''}{t.column_id === 'done' ? ' ✓' : ''}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {noDate.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">No dates yet ({noDate.length}) — set Dates in the task to show it here</p>
          <div className="flex flex-wrap gap-1.5">
            {noDate.map((t) => <button key={t.task_id} type="button" onClick={() => onOpen(t.task_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12px]"><TypePill type={typeOf(types, t.type_id)} />{t.name}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}
