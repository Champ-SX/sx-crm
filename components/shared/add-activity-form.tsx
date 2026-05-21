'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface AddActivityFormProps {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  owner: string
}

export function AddActivityForm({ entityType, entityId, owner }: AddActivityFormProps) {
  const { addActivity } = useCRMStore()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    addActivity({
      activity_id: `act-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: 'note',
      title: 'Note added',
      description: text.trim(),
      created_by: owner,
      created_at: new Date().toISOString(),
    })
    setText('')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a note for this record…"
          className="text-sm resize-none min-h-[80px] pr-16"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
          }}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || saving}
          className="absolute bottom-2 right-2 h-7 px-2.5 text-xs gap-1"
        >
          <Send className="w-3 h-3" /> Log
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">⌘ + Enter to save</p>
    </form>
  )
}
