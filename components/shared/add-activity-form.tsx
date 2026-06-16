'use client'

import { useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { MentionTextarea } from '@/components/shared/mention-textarea'
import { Send, Paperclip, X, AlertCircle, File as FileIcon } from 'lucide-react'
import { ActivityAttachment } from '@/types'

interface AddActivityFormProps {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  owner: string
  entityName?: string  // record title, for @mention notification context
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']

export function AddActivityForm({ entityType, entityId, owner, entityName }: AddActivityFormProps) {
  const { addActivity, notifyMentions } = useCRMStore()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function isImageFile(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType)
  }

  function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Remove "data:image/png;base64," prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file) // Start reading the file
    })
  }

  // Validate + read each file, appending with a functional update so multiple
  // files (e.g. a multi-file drop) all stick instead of clobbering each other.
  async function processFiles(fileList: FileList | File[]) {
    setError(null)
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`)
        continue
      }
      const isImage = isImageFile(file.type)
      const isAllowedFile = ALLOWED_FILE_TYPES.includes(file.type)
      if (!isImage && !isAllowedFile) {
        setError(`File type "${file.type || 'unknown'}" is not supported. Allowed: images (JPEG, PNG, GIF, WebP) and documents (PDF, Word, Excel, TXT, ZIP).`)
        continue
      }
      try {
        const base64 = await convertFileToBase64(file)
        setAttachments((prev) => [...prev, { filename: file.name, size: file.size, type: file.type, data: base64 }])
      } catch {
        setError(`Failed to process file "${file.name}". Please try again.`)
      }
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) await processFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) await processFiles(e.dataTransfer.files)
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() && attachments.length === 0) return

    setSaving(true)
    try {
      const fileMarker = attachments.length > 0
        ? `📎 ${attachments.length} file${attachments.length !== 1 ? 's' : ''} attached`
        : ''
      const noteText = text.trim()
      addActivity({
        activity_id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'note',
        title: 'Note',
        // Store what the user actually wrote so the history shows it (not a placeholder)
        description: noteText
          ? (fileMarker ? `${noteText}\n${fileMarker}` : noteText)
          : (fileMarker || '[Note]'),
        created_by: user?.user_metadata?.full_name ?? user?.email ?? owner,
        created_at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      // Create in-app notifications (+ stubbed email) for any @mentions
      if (text.trim()) {
        notifyMentions({
          text,
          actor: owner,
          entityType,
          entityId,
          entityName: entityName || '',
        })
      }
      setText('')
      setAttachments([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save activity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2.5 flex gap-2 items-start text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div
        className={`relative rounded-md transition-colors ${dragOver ? 'ring-2 ring-primary ring-offset-1' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOver(false) }}
        onDrop={handleDrop}
      >
        <MentionTextarea
          value={text}
          onChange={setText}
          placeholder="Write a note… type @ to mention a teammate"
          className="text-sm resize-none min-h-[80px] pr-16"
          onSubmitShortcut={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
        />
        <Button
          type="submit"
          size="sm"
          disabled={(!text.trim() && attachments.length === 0) || saving}
          className="absolute bottom-2 right-2 h-7 px-2.5 text-xs gap-1 z-10"
        >
          <Send className="w-3 h-3" /> {saving ? 'Saving…' : 'Log'}
        </Button>
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5 pointer-events-none">
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Paperclip className="w-3.5 h-3.5" /> Drop files to attach
            </span>
          </div>
        )}
      </div>

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="space-y-2 bg-muted/50 rounded-md p-3 border border-border">
          <p className="text-xs font-medium text-foreground">Attachments ({attachments.length})</p>
          <div className="space-y-1.5">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between bg-background rounded p-1.5 text-xs border border-border">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isImageFile(att.type) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:${att.type};base64,${att.data}`}
                      alt={att.filename}
                      className="w-9 h-9 rounded object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <FileIcon className="w-4 h-4" />
                    </span>
                  )}
                  <span className="truncate text-foreground">{att.filename}</span>
                  <span className="text-muted-foreground flex-shrink-0">({formatFileSize(att.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="flex-shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label={`Remove ${att.filename}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File upload button */}
      <div className="flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 text-xs gap-1.5"
        >
          <Paperclip className="w-3.5 h-3.5" /> Upload file
        </Button>
        <p className="text-[10px] text-muted-foreground">
          or drop files here • max 5MB • images &amp; documents
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground">⌘ + Enter to save</p>
    </form>
  )
}
