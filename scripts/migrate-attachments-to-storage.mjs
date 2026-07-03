// Phase 2.8 one-off migration: move legacy base64 attachments out of
// activities.attachments into the 'activity-attachments' Storage bucket,
// rewriting each row to hold { filename, size, type, storage_path }.
//
// Prerequisites:
//   1. Run supabase/migrations/create_activity_attachments_bucket.sql first.
//   2. Supabase service must not be restricted (egress quota).
//
// Usage:
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key>  \
//   node scripts/migrate-attachments-to-storage.mjs [--dry-run]
//
// Idempotent: attachments that already have storage_path are skipped, so it
// can be re-run safely if interrupted.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dryRun = process.argv.includes('--dry-run')

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const supabase = createClient(url, key)
const BUCKET = 'activity-attachments'

const { data: rows, error } = await supabase
  .from('activities')
  .select('activity_id, attachments')
  .not('attachments', 'is', null)

if (error) {
  console.error('Failed to list activities:', error.message)
  process.exit(1)
}

let migratedFiles = 0
let migratedRows = 0
let skipped = 0
let failed = 0

for (const row of rows ?? []) {
  const atts = row.attachments ?? []
  let rowChanged = false
  const next = []

  for (const att of atts) {
    if (att.storage_path || !att.data) {
      // Already migrated, or nothing to move
      next.push(att)
      skipped++
      continue
    }
    const safeName = String(att.filename || 'file').replace(/[^\w.\-]+/g, '_')
    const path = `${randomUUID()}/${safeName}`
    if (dryRun) {
      console.log(`[dry-run] would upload ${att.filename} (${att.size} B) -> ${path}`)
      next.push(att)
      continue
    }
    try {
      const bytes = Buffer.from(att.data, 'base64')
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: att.type || 'application/octet-stream', upsert: false })
      if (upErr) throw upErr
      next.push({ filename: att.filename, size: att.size, type: att.type, storage_path: path })
      migratedFiles++
      rowChanged = true
      console.log(`uploaded ${att.filename} -> ${path}`)
    } catch (err) {
      console.error(`FAILED ${row.activity_id} / ${att.filename}:`, err.message ?? err)
      next.push(att) // keep legacy base64 so nothing is lost
      failed++
    }
  }

  if (rowChanged && !dryRun) {
    const { error: updErr } = await supabase
      .from('activities')
      .update({ attachments: next })
      .eq('activity_id', row.activity_id)
    if (updErr) {
      console.error(`FAILED to rewrite row ${row.activity_id}:`, updErr.message)
      failed++
    } else {
      migratedRows++
    }
  }
}

console.log('\n── Migration summary ─────────────────────────')
console.log(`files uploaded:   ${migratedFiles}`)
console.log(`rows rewritten:   ${migratedRows}`)
console.log(`already-ok atts:  ${skipped}`)
console.log(`failures:         ${failed}`)
if (dryRun) console.log('(dry run — nothing was changed)')
