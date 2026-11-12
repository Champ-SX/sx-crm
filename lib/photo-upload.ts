import type { ActivityAttachment } from '@/types'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { uploadAttachmentFile } from '@/lib/supabase/storage'
import { prepareImage } from '@/lib/image-compress'

/** Shrink + upload one photo to the attachments bucket (base64 in local mock mode). */
export async function uploadPhoto(original: File): Promise<ActivityAttachment> {
  const file = await prepareImage(original)
  if (!isSupabaseConfigured) {
    const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(file) })
    return { filename: file.name, size: file.size, type: file.type, data }
  }
  return { filename: file.name, size: file.size, type: file.type, storage_path: await uploadAttachmentFile(file) }
}
