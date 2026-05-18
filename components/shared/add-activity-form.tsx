'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Activity } from '@/types'
import { Phone, Mail, StickyNote, Bell, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_TYPES: {
  type: Activity['activity_type']
  label: string
  icon: React.ElementType
  color: string
  activeColor: string
}[] = [
  { type: 'note', label: 'Note', icon: StickyNote, color: 'text-zinc-500', activeColor: 'bg-zinc-100 text-zinc-700 border-zinc-300' },
  { type: 'call', label: 'Call', icon: Phone, color: 'text-blue-500', activeColor: 'bg-blue-50 text-blue-700 border-blue-300' },
  { type: 'email', label: 'Email', icon: Mail, color: 'text-indigo-500', activeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
  { type: 'follow_up', label: 'Follow-up', icon: Bell, color: 'text-amber-500', activeColor: 'bg-amber-50 text-amber-700 border-amber-300' },
]

interface AddActivityFormProps {
  entityType: Activity['entity_type']
  entityId: string
  owner: string
}

export function AddActivityForm({ entityType, entityId, owner }: AddActivityFormProps) {
  const { addActivity } = useCRMStore()
  const [type, setType] = useState<Activity['activity_type']>('note')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const placeholders: Record<string, string> = {
    note: 'Add a note…',
    call: 'What was discussed on the call?',
    email: 'What did the email say?',
    follow_up: 'What needs to happen next?',
  }

  const titles: Record<string, string> = {
    note: 'Note added',
    call: 'Call logged',
    email: 'Email logged',
    follow_up: 'Follow-up logged',
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    addActivity({
      activity_id: `act-${Date.now()}`,
      entity_type: entityType,
      entity_id: entityId,
      activity_type: type,
      title: titles[type],
      description: text.trim(),
      created_by: owner,
      created_at: new Date().toISOString(),
    })
    setText('')
    setSaving(false)
  }

  const selected = ACTIVITY_TYPES.find((a) => a.type === type)!

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Type selector */}
      <div className="flex gap-1.5">
        {ACTIVITY_TYPES.map(({ type: t, label, icon: Icon, activeColor }) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all',
              type === t
                ? activeColor
                : 'border-border text-muted-foreground hover:bg-muted/60'
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholders[type]}
          className="text-sm resize-none min-h-[72px] pr-16"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
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
