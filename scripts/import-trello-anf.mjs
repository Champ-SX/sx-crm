#!/usr/bin/env node
// One-off: Trello "Andy OPERATION" JSON export → Andy & Fine. tasks.
//
//   node scripts/import-trello-anf.mjs <export.json> [out.sql]
//
// Prints a dry-run report. With out.sql it also writes an idempotent SQL file
// (re-runnable: ON CONFLICT on task_id / activity_id) to review and run in the
// Supabase SQL editor after the 20261014_anf_tasks_board migration.
// The export holds customer contacts — keep out.sql OUT of the repo.

import fs from 'node:fs'

const [, , src, out] = process.argv
if (!src) { console.error('usage: node scripts/import-trello-anf.mjs <export.json> [out.sql]'); process.exit(1) }
const d = JSON.parse(fs.readFileSync(src, 'utf8'))

const lists = new Map(d.lists.map((l) => [l.id, l]))
const labels = new Map(d.labels.map((l) => [l.id, l.name]))
const members = new Map(d.members.map((m) => [m.id, m.fullName]))
const checklists = new Map(d.checklists.map((c) => [c.id, c]))

// ── Mapping rules ──
const columnFor = (listName) =>
  /^1\./.test(listName) ? 'new' : /^2\./.test(listName) ? 'progress' : /^3\./.test(listName) ? 'waiting' : 'solved'
const LEVEL = { 'Critical': 'critical', 'Major': 'major', 'Minor': 'minor' }
const AREA = { 'Camera': 'camera', 'Printer': 'printer', 'Software': 'software', 'Internet': 'internet' }
// Order matters: Trello's "Maintenance" label was used as a catch-all, so the
// title's intent (frame / content) wins over it.
const CONTENT_RE = /โพสต์|\bpost|KOL|\bPR\b|boardcast|broadcast|content|คอนเทนต์|promot|membership|report of|coupon|what'?s happening|city ?guide|collab|campaign|package|แผนการสื่อสาร|โปรโมท/i
const MAINT_RE = /maintenance|เสีย|ซ่อม|เปลี่ยน|ไฟ|internet|เน็ต|ซิม|ปริ้น|ปรินท์|ทาสี|ย้าย|เก้าอี้|วัสดุ|เปิดไม่ติด|ไม่สว่าง|issue|test onsite|ถอด|อะคริลิค|background|สเตป|ดาว|email/i
function typeFor(lbls, name) {
  if (lbls.some((l) => /AW FRAME/i.test(l)) || /ลงเฟรม|frame/i.test(name)) return 'frame'
  if (lbls.some((l) => /R&D/i.test(l))) return 'rnd'
  if (CONTENT_RE.test(name)) return 'content'
  if (lbls.some((l) => /Maintenance/i.test(l)) || MAINT_RE.test(name)) return 'maintenance'
  return 'other'
}
// Not real tasks: the colour-legend card and leftover template copies.
const isJunk = (name) => /^\s*🟦/.test(name) || /\[\s*BoothID\s*\]/i.test(name)
const BRANCHES = [[/BACC/i, 'BACC'], [/BTT|บรรทัดทอง/i, 'BTT'], [/TRUE[\s_-]*ALPHA/i, 'True Alpha'], [/CENTRAL\s*WORLD|WIMB/i, 'CentralWorld']]
function placeFor(name) {
  const branch = BRANCHES.find(([re]) => re.test(name))?.[1] ?? null
  const room = name.match(/\b(A\d{2}|B\d{2}|K0?\d{2,3})\b/i)?.[1]?.toUpperCase()
    ?? (/music/i.test(name) ? 'Music room' : /what'?s in my bag|\bbag\b/i.test(name) ? "What's in my Bag" : /long table/i.test(name) ? 'Long Table' : null)
  return { branch, room }
}
/** Strip the leading date / [place] prefix Trello titles carry. */
function cleanName(n) {
  return n
    .replace(/^\s*(YYMM\s?DD|YYMMDD|\d{4}\.\d{2}\.\d{2}(?:-\d{1,2})?|\d{6,8}(?:-\d{1,2})?)\s*/i, '')
    .replace(/^\s*-?\s*\[[^\]]*\]\s*/, '')
    .replace(/^\s*[-–]\s*/, '')
    .trim() || n.trim()
}
const trelloDate = (id) => new Date(parseInt(id.slice(0, 8), 16) * 1000)   // created time from the ObjectId
const yymmdd = (dt) => dt.toISOString().slice(2, 10).replace(/-/g, '')
const isoDate = (s) => (s ? s.slice(0, 10) : null)

// ── Build ──
const tasks = []
const skipped = []
const unmatchedTypes = []
for (const c of d.cards) {
  const list = lists.get(c.idList)
  if (/_Template_/.test(list.name) || isJunk(c.name)) { skipped.push(c.name); continue }
  const lbls = c.idLabels.map((i) => labels.get(i)).filter(Boolean)
  const name = cleanName(c.name)
  const { branch, room } = placeFor(c.name)
  const created = trelloDate(c.id)
  const type = typeFor(lbls, c.name)
  if (type === 'other') unmatchedTypes.push(c.name)
  const lists_ = c.idChecklists.map((id) => checklists.get(id)).filter(Boolean)
    .filter((cl) => cl.name.trim().toUpperCase() !== 'OWNER')       // owner trail is automatic now
    .map((cl) => ({ id: cl.id, name: cl.name, items: cl.checkItems.sort((a, b) => a.pos - b.pos).map((i) => ({ id: i.id, text: i.name, done: i.state === 'complete' })) }))
  const atts = d.actions.filter((a) => a.type === 'addAttachmentToCard' && a.data.card?.id === c.id).map((a) => a.data.attachment)
  let desc = c.desc?.trim() || ''
  if (atts.length) desc += `${desc ? '\n\n' : ''}Attachments (Trello — sign in to open):\n` + atts.map((a) => `• ${a.name}: ${a.url}`).join('\n')
  const col = columnFor(list.name)
  tasks.push({
    task_id: `trello-${c.id}`, trello_id: c.id, column_id: col, position: 0, _pos: c.pos, _list: c.idList,
    title: `${yymmdd(created)}${branch || room ? `-[${[branch, room].filter(Boolean).join('-')}]` : ''} - ${name}`,
    name, type_id: type,
    issue_level: Object.entries(LEVEL).find(([k]) => lbls.some((l) => l.includes(k)))?.[1] ?? null,
    area: Object.entries(AREA).find(([k]) => lbls.some((l) => l.includes(k)))?.[1] ?? null,
    branch, room, start_date: isoDate(c.start), due_date: isoDate(c.due),
    description: desc || null,
    assignee_names: c.idMembers.map((m) => members.get(m)).filter(Boolean),
    checklists: lists_,
    tags: lbls.filter((l) => /SX\.DEV|Repeating/i.test(l)).map((l) => l.replace(/[^\w.& ]/g, '').trim()),
    solved_at: col === 'solved' ? c.dateLastActivity : null,
    is_archived: c.closed || /^ARCHIVE$/i.test(list.name),
    created_at: created.toISOString(), updated_at: c.dateLastActivity,
    _labels: lbls,
  })
}
// Trello positions are huge floats — re-rank 0,1,2… within each list.
const byList = {}
for (const t of tasks) (byList[t._list] ??= []).push(t)
for (const l of Object.values(byList)) l.sort((a, b) => a._pos - b._pos).forEach((t, i) => { t.position = i })
const ids = new Set(tasks.map((t) => t.trello_id))
const comments = d.actions.filter((a) => a.type === 'commentCard' && ids.has(a.data.card?.id)).map((a) => ({
  activity_id: `trello-${a.id}`, entity_id: `trello-${a.data.card.id}`, text: a.data.text,
  by: a.memberCreator?.fullName ?? 'Trello', at: a.date,
}))

// ── Report ──
const count = (k) => tasks.reduce((m, t) => ((m[t[k] ?? '—'] = (m[t[k] ?? '—'] ?? 0) + 1), m), {})
console.log(`\nTrello → Andy & Fine. — dry run\n`)
console.log(`Tasks to import: ${tasks.length}  (skipped ${skipped.length} template cards)`)
console.log(`  active: ${tasks.filter((t) => !t.is_archived).length} · archived: ${tasks.filter((t) => t.is_archived).length}`)
console.log('Columns (active only):', tasks.filter((t) => !t.is_archived).reduce((m, t) => ((m[t.column_id] = (m[t.column_id] ?? 0) + 1), m), {}))
console.log('Types:', count('type_id'))
console.log('Issue levels:', count('issue_level'))
console.log('Branches:', count('branch'))
console.log('Rooms:', count('room'))
console.log(`Checklists: ${tasks.reduce((n, t) => n + t.checklists.length, 0)} (OWNER checklists dropped)`)
console.log(`Comments → activity: ${comments.length} (export only reaches back to ${d.actions.at(-1)?.date.slice(0, 10)})`)
console.log(`With Trello attachment links: ${tasks.filter((t) => /Attachments \(Trello/.test(t.description ?? '')).length}`)
const names = [...new Set(tasks.flatMap((t) => t.assignee_names))]
console.log('Assignees (matched to SX-CRM users by name when the SQL runs):', names.join(', '))
console.log(`\n"Other" type (${unmatchedTypes.length}) — review / retag after import:`)
unmatchedTypes.slice(0, 40).forEach((n) => console.log('  ·', n))
console.log('\nSample titles:')
tasks.slice(0, 12).forEach((t) => console.log(`  ${t.title}   [${t.type_id}${t.issue_level ? '/' + t.issue_level : ''}]`))

// ── SQL ──
if (out) {
  const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
  const arr = (a) => `ARRAY[${a.map(q).join(',')}]::text[]`
  const lines = ['-- Generated by scripts/import-trello-anf.mjs — contains customer data, do not commit.', 'BEGIN;']
  for (const t of tasks) {
    const assignees = t.assignee_names.length
      ? `COALESCE(ARRAY(SELECT id::text FROM users WHERE lower(name) IN (${t.assignee_names.map((n) => q(n.toLowerCase())).join(',')})), '{}')`
      : `'{}'`
    lines.push(`INSERT INTO anf_tasks (task_id, trello_id, board_id, column_id, position, title, name, type_id, issue_level, area, branch, room, start_date, due_date, description, assignee_ids, checklists, tags, solved_at, is_archived, created_by, created_at, updated_at) VALUES (` +
      [q(t.task_id), q(t.trello_id), "'anf'", q(t.column_id), t.position, q(t.title), q(t.name), q(t.type_id), q(t.issue_level), q(t.area), q(t.branch), q(t.room),
        q(t.start_date), q(t.due_date), q(t.description), assignees, `${q(JSON.stringify(t.checklists))}::jsonb`, arr(t.tags), q(t.solved_at),
        t.is_archived, "'Trello import'", q(t.created_at), q(t.updated_at)].join(', ') +
      `) ON CONFLICT (task_id) DO NOTHING;`)
  }
  for (const c of comments) {
    lines.push(`INSERT INTO activities (activity_id, entity_type, entity_id, activity_type, title, description, created_by, created_at) VALUES (` +
      [q(c.activity_id), "'anf_task'", q(c.entity_id), "'note'", "'Note'", q(c.text), q(c.by), q(c.at)].join(', ') + `) ON CONFLICT (activity_id) DO NOTHING;`)
  }
  lines.push('COMMIT;')
  fs.writeFileSync(out, lines.join('\n') + '\n')
  console.log(`\nSQL written → ${out} (${tasks.length} tasks, ${comments.length} comments)`)
}
