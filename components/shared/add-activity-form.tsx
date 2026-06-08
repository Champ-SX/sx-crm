'use client'

import { useState, useRef } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, X, AlertCircle, Image as ImageIcon, File as FileIcon } from 'lucide-react'
import { ActivityAttachment } from '@/types'

interface AddActivityFormProps {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  owner: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']

export function AddActivityForm({ entityType, entityId, owner }: AddActivityFormProps) {
  const { addActivity } = useCRMStore()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`)
        continue
      }

      // Validate file type
      const isImage = isImageFile(file.type)
      const isAllowedFile = ALLOWED_FILE_TYPES.includes(file.type)

      if (!isImage && !isAllowedFile) {
        setError(`File type "${file.type}" is not supported. Allowed: images (JPEG, PNG, GIF, WebP) and documents (PDF, Word, Excel, TXT, ZIP).`)
        continue
      }

      try {
        const base64 = await convertFileToBase64(file)
        const attachment: ActivityAttachment = {
          filename: file.name,
          size: file.size,
          type: file.type,
          data: base64,
        }
        setAttachments([...attachments, attachment])
      } catch (err) {
        setError(`Failed to process file "${file.name}". Please try again.`)
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeAttachment(index: number) {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  function getFileIcon(attachment: ActivityAttachment) {
    return isImageFile(attachment.type) ? (
      <ImageIcon className="w-3 h-3" />
    ) : (
      <FileIcon className="w-3 h-3" />
    )
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
      addActivity({
        activity_id: `act-${Date.now()}`,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'note',
        title: attachments.length > 0 ? 'Note with attachments' : 'Note added',
        description: attachments.length > 0 ? `[${attachments.length} file${attachments.length !== 1 ? 's' : ''} attached]` : '[Note]',
        created_by: owner,
        created_at: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined,
      })
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

      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note for this record… (optional if uploading files)"
          className="text-sm resize-none min-h-[80px] pr-16"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={(!text.trim() && attachments.length === 0) || saving}
          className="absolute bottom-2 right-2 h-7 px-2.5 text-xs gap-1"
        >
          <Send className="w-3 h-3" /> {saving ? 'Saving…' : 'Log'}
        </Button>
      </div>

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="space-y-2 bg-slate-50 rounded-md p-3 border border-slate-200">
          <p className="text-xs font-medium text-slate-700">Attachments ({attachments.length})</p>
          <div className="space-y-1">
            {attachments.map((att, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded p-2 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(att)}
                  <span className="truncate text-slate-700">{att.filename}</span>
                  <span className="text-slate-500 flex-shrink-0">({formatFileSize(att.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="flex-shrink-0 ml-2 text-slate-400 hover:text-red-600 transition-colors"
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
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Paperclip className="w-3 h-3" /> Attach
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Max 5MB per file • Images & documents only
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground">⌘ + Enter to save</p>
    </form>
  )
}
