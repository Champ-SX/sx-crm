'use client'

import { useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { ActivityTimeline } from './activity-timeline'
import { MentionTextarea } from './mention-textarea'
import { useAttachmentUploader, ACCEPT_ATTR } from './use-attachment-uploader'
import { UploadTiles, UploadNotice } from './attachment-gallery'
import { ListChecks, Paperclip, ArrowUp, Loader2 } from 'lucide-react'

function initialsFor(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return email?.[0]?.toUpperCase() ?? '?'
}

/**
 * MobileCardView — Trello-style single-scroll detail layout for mobile.
 *
 * Renders the record's detail fields (passed as children), then an Activity
 * feed, with a sticky comment composer pinned to the bottom. Mobile-only;
 * desktop drawers keep their existing two-column layout.
 */
export function MobileCardView({
  entityType,
  entityId,
  owner,
  entityName,
  children,
}: {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  owner: string
  entityName?: string
  children: React.ReactNode
}) {
  const { addActivity, notifyMentions } = useCRMStore()
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const up = useAttachmentUploader()
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = initialsFor(user?.user_metadata?.full_name, user?.email)
  const author = user?.user_metadata?.full_name ?? user?.email ?? owner

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) up.add(e.dataTransfer.files)
  }

  const canSend = (comment.trim().length > 0 || up.attachments.length > 0) && up.uploading === 0 && up.failed === 0

  function submit() {
    if (!canSend) return
    const note = comment.trim()
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
    setComment('')
    up.reset()
  }

  return (
    <div className="sm:hidden flex flex-col flex-1 overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Details (caller-provided) */}
        {children}

        {/* Activity section header */}
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-3 mt-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
        </div>

        {/* Activity feed */}
        <div className="px-4 pb-4">
          <ActivityTimeline entityType={entityType} entityId={entityId} entityName={entityName} />
        </div>
      </div>

      {/* Sticky comment composer */}
      <div
        className={`relative shrink-0 border-t border-border bg-background transition-colors ${dragOver ? 'ring-2 ring-primary ring-inset' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOver(false) }}
        onDrop={handleDrop}
        onPaste={(e) => { up.addFromPaste(e) }}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-primary bg-primary/5 pointer-events-none">
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Paperclip className="w-3.5 h-3.5" /> Drop files to attach
            </span>
          </div>
        )}
        <p className="px-3 pt-2 text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">
          Log activity
        </p>
        {(up.items.length > 0 || up.notice) && (
          <div className="px-3 pt-2 space-y-1.5">
            <UploadTiles items={up.items} onRemove={up.remove} onRetry={up.retry} size="sm" />
            <UploadNotice text={up.notice} />
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* User avatar */}
          <div className="w-7 h-7 shrink-0 rounded-full bg-amber-500 text-white text-[12px] font-semibold flex items-center justify-center">
            {initials}
          </div>

          {/* Comment input — MentionTextarea so @ autocomplete works on mobile */}
          <div className="flex-1 flex items-end gap-1 bg-muted rounded-2xl pl-3 pr-1.5 py-0.5 min-w-0">
            <div className="flex-1 min-w-0">
              <MentionTextarea
                value={comment}
                onChange={setComment}
                placeholder="Comment… type @ to mention"
                className="bg-transparent border-0 shadow-none resize-none min-h-0 h-8 py-1.5 px-0 text-sm leading-tight focus-visible:ring-0 focus-visible:ring-offset-0"
                onSubmitShortcut={submit}
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => { if (e.target.files?.length) up.add(e.target.files); e.target.value = '' }}
              accept={ACCEPT_ATTR}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
              aria-label="Send comment"
            >
              {up.uploading > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
