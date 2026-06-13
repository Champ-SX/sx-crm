'use client'

import { useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { ActivityTimeline } from './activity-timeline'
import type { ActivityAttachment } from '@/types'
import { ListChecks, Paperclip, ArrowUp, X } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = initialsFor(user?.user_metadata?.full_name, user?.email)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" is over 5MB.`)
        continue
      }
      try {
        const data = await fileToBase64(file)
        setAttachments((prev) => [...prev, { filename: file.name, size: file.size, type: file.type, data }])
      } catch {
        setError(`Couldn't attach "${file.name}".`)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function submit() {
    if (!comment.trim() && attachments.length === 0) return
    addActivity({
      activity_id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'note',
      title: comment.trim() || (attachments.length > 0 ? 'Attachment added' : 'Note added'),
      description: comment.trim() || (attachments.length > 0 ? `[${attachments.length} file(s)]` : '[Note]'),
      created_by: user?.user_metadata?.full_name ?? user?.email ?? owner,
      created_at: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    if (comment.trim()) {
      notifyMentions({ text: comment, actor: user?.user_metadata?.full_name ?? user?.email ?? owner, entityType, entityId, entityName: entityName || '' })
    }
    setComment('')
    setAttachments([])
    setError(null)
  }

  const canSend = comment.trim().length > 0 || attachments.length > 0

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
      <div className="shrink-0 border-t border-border bg-background">
        <p className="px-3 pt-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Log activity
        </p>
        {error && (
          <p className="px-3 pt-1 text-[11px] text-red-500">{error}</p>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {attachments.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-muted text-foreground text-[11px] rounded-full pl-2.5 pr-1 py-0.5">
                <span className="truncate max-w-[120px]">{a.filename}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="rounded-full hover:bg-background/60 p-0.5"
                  aria-label={`Remove ${a.filename}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* User avatar */}
          <div className="w-7 h-7 shrink-0 rounded-full bg-amber-500 text-white text-[11px] font-semibold flex items-center justify-center">
            {initials}
          </div>

          {/* Comment input */}
          <div className="flex-1 flex items-center gap-1 bg-muted rounded-full pl-4 pr-1.5 py-1">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Comment…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFiles}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
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
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
