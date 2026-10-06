'use client'

import { useRef, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { MentionTextarea } from '@/components/shared/mention-textarea'
import { Send, Paperclip, ImagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAttachmentUploader, ACCEPT_ATTR } from './use-attachment-uploader'
import { UploadTiles, UploadNotice } from './attachment-gallery'

interface AddActivityFormProps {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  owner: string
  entityName?: string  // record title, for @mention notification context
}

/**
 * Note composer. Photos/files upload the moment they're added (paste, drop,
 * or the buttons), show as tiles with live status, and Post waits for them.
 */
export function AddActivityForm({ entityType, entityId, owner, entityName }: AddActivityFormProps) {
  const { addActivity, notifyMentions } = useCRMStore()
  const { user } = useAuth()
  const up = useAttachmentUploader()
  const [text, setText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const hasContent = text.trim().length > 0 || up.attachments.length > 0
  const blocked = up.uploading > 0 || up.failed > 0
  const canPost = hasContent && !blocked
  const author = user?.user_metadata?.full_name ?? user?.email ?? owner

  function post() {
    if (!canPost) return
    const note = text.trim()
    void addActivity({
      activity_id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'note',
      title: 'Note',
      description: note,
      created_by: author,
      created_at: new Date().toISOString(),
      attachments: up.attachments.length > 0 ? up.attachments : undefined,
    })
    if (note) notifyMentions({ text: note, actor: author, entityType, entityId, entityName: entityName || '' })
    setText('')
    up.reset()
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) up.add(e.target.files)
    e.target.value = ''
  }

  return (
    <div
      className={cn('relative rounded-xl border bg-card transition-colors', dragOver ? 'border-primary ring-2 ring-primary/20' : 'border-border focus-within:border-foreground/30')}
      onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) up.add(e.dataTransfer.files) }}
      onPaste={(e) => { up.addFromPaste(e) }}
    >
      <MentionTextarea
        value={text}
        onChange={setText}
        placeholder="Write a note, or paste / drop photos… (@ to mention)"
        className="text-sm resize-none min-h-[72px] border-0 shadow-none focus-visible:ring-0 bg-transparent px-3 pt-3"
        onSubmitShortcut={post}
      />

      {(up.items.length > 0 || up.notice) && (
        <div className="px-3 pb-2 space-y-2">
          <UploadTiles items={up.items} onRemove={up.remove} onRetry={up.retry} />
          <UploadNotice text={up.notice} />
          {up.failed > 0 && <p className="text-[12px] text-destructive">{up.failed} file{up.failed > 1 ? 's' : ''} failed — tap to retry, or remove it to post.</p>}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
        <input ref={photoInput} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={pick} />
        <input ref={fileInput} type="file" accept={ACCEPT_ATTR} multiple className="hidden" onChange={pick} />
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5 text-muted-foreground" onClick={() => photoInput.current?.click()}>
          <ImagePlus className="w-4 h-4" /> Photos
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5 text-muted-foreground" onClick={() => fileInput.current?.click()}>
          <Paperclip className="w-4 h-4" /> File
        </Button>
        <span className="hidden md:inline text-[11px] text-muted-foreground ml-1">⌘↵ to post</span>
        <Button type="button" size="sm" disabled={!canPost} onClick={post} className="ml-auto h-8 px-3 gap-1.5">
          {up.uploading > 0
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading {up.uploading}…</>
            : <><Send className="w-3.5 h-3.5" /> Post</>}
        </Button>
      </div>

      {dragOver && (
        <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center pointer-events-none">
          <span className="text-[13px] font-medium text-primary inline-flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> Drop to attach</span>
        </div>
      )}
    </div>
  )
}
