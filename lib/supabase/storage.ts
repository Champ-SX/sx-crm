import { supabase, isSupabaseConfigured } from './client'
import type { ActivityAttachment } from '@/types'

/**
 * Activity attachment files live in a Storage bucket (Phase 2.8) instead of
 * base64 inside the activities row — file bytes no longer ride along on DB
 * queries (the cause of the egress overage). Rows keep only a small reference
 * ({ filename, size, type, storage_path }); legacy rows may still carry
 * base64 `data` until the one-off migration script runs.
 *
 * Bucket: public read (paths are unguessable UUIDs), authenticated write —
 * see supabase/migrations/create_activity_attachments_bucket.sql.
 */
export const ATTACHMENTS_BUCKET = 'activity-attachments'

/** Upload a file to the attachments bucket. Returns the storage path. */
export async function uploadAttachmentFile(file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${crypto.randomUUID()}/${safeName}`
  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw error
  return path
}

/**
 * Resolve a displayable/downloadable URL for an attachment.
 * New shape → public bucket URL; legacy shape → base64 data URI.
 */
export function attachmentUrl(att: Pick<ActivityAttachment, 'type' | 'data' | 'storage_path'>): string | null {
  if (att.storage_path) {
    return supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(att.storage_path).data.publicUrl
  }
  if (att.data) return `data:${att.type};base64,${att.data}`
  return null
}

/** Best-effort removal of storage objects (e.g. when a note is deleted). */
export async function deleteAttachmentFiles(atts: ActivityAttachment[] | null | undefined): Promise<void> {
  const paths = (atts || []).map((a) => a.storage_path).filter((p): p is string => !!p)
  if (paths.length === 0 || !isSupabaseConfigured) return
  try {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths)
  } catch (err) {
    // Orphaned files are a cost concern, not a correctness one — log and move on.
    console.warn('[storage] attachment cleanup failed:', err)
  }
}
