'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActivityAttachment } from '@/types'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { uploadAttachmentFile, deleteAttachmentFiles } from '@/lib/supabase/storage'
import { prepareImage, isImageLike } from '@/lib/image-compress'

export const MAX_FILE_BYTES = 10 * 1024 * 1024 // documents; images are shrunk first
const DOC_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip',
]
export const ACCEPT_ATTR = 'image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip'

export type UploadStatus = 'uploading' | 'done' | 'error'
export interface UploadItem {
  id: string
  name: string
  isImage: boolean
  previewUrl: string | null     // local object URL — instant thumbnail while uploading
  status: UploadStatus
  error?: string
  attachment?: ActivityAttachment
  file: File                    // original, kept for retry
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

const uid = () => `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** Shared upload state for every activity composer (desktop panel + mobile bar). */
export function useAttachmentUploader() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  const patch = (id: string, p: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)))

  const upload = useCallback(async (id: string, original: File) => {
    patch(id, { status: 'uploading', error: undefined })
    try {
      const file = isImageLike(original) ? await prepareImage(original) : original
      if (file.size > MAX_FILE_BYTES) throw new Error(`“${original.name}” is over 10 MB.`)
      const attachment: ActivityAttachment = isSupabaseConfigured
        ? { filename: file.name, size: file.size, type: file.type, storage_path: await uploadAttachmentFile(file) }
        : { filename: file.name, size: file.size, type: file.type, data: await readBase64(file) }
      patch(id, { status: 'done', attachment })
    } catch (e) {
      patch(id, { status: 'error', error: e instanceof Error ? e.message : 'Upload failed' })
    }
  }, [])

  const add = useCallback((files: FileList | File[]) => {
    setNotice(null)
    const accepted: UploadItem[] = []
    for (const file of Array.from(files)) {
      const isImage = isImageLike(file)
      if (!isImage && !DOC_TYPES.includes(file.type)) {
        setNotice(`“${file.name}” isn't a supported file type.`)
        continue
      }
      accepted.push({
        id: uid(), name: file.name, isImage, file, status: 'uploading',
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      })
    }
    if (accepted.length === 0) return
    setItems((prev) => [...prev, ...accepted])
    accepted.forEach((it) => void upload(it.id, it.file))
  }, [upload])

  const retry = useCallback((id: string) => {
    const it = itemsRef.current.find((x) => x.id === id)
    if (it) void upload(id, it.file)
  }, [upload])

  const remove = useCallback((id: string) => {
    const it = itemsRef.current.find((x) => x.id === id)
    if (it?.attachment?.storage_path) void deleteAttachmentFiles([it.attachment])  // don't orphan
    if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl)
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  /** After posting: clear without deleting the (now referenced) Storage files. */
  const reset = useCallback(() => {
    itemsRef.current.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl))
    setItems([])
    setNotice(null)
  }, [])

  /** Images pasted from the clipboard (screenshots). Returns true if any were taken. */
  const addFromPaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files ?? [])
    if (files.length === 0) return false
    e.preventDefault()
    add(files.map((f, i) => (f.name && f.name !== 'image.png'
      ? f
      : new File([f], `pasted-${Date.now()}-${i + 1}.png`, { type: f.type || 'image/png' }))))
    return true
  }, [add])

  useEffect(() => () => itemsRef.current.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl)), [])

  const uploading = items.filter((i) => i.status === 'uploading').length
  const failed = items.filter((i) => i.status === 'error').length
  const attachments = items.filter((i) => i.status === 'done' && i.attachment).map((i) => i.attachment!)

  return { items, attachments, uploading, failed, notice, setNotice, add, addFromPaste, retry, remove, reset }
}
