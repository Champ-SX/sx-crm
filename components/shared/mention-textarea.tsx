'use client'

import { useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { useCRMStore } from '@/store/crm-store'
import type { TeamMember } from '@/types'
import { cn } from '@/lib/utils'

interface MentionTextareaProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  onSubmitShortcut?: () => void // fired on ⌘/Ctrl+Enter
}

/**
 * Textarea with @mention autocomplete. Typing "@" opens a dropdown of team
 * members; selecting one inserts "@Name ". Names come from the store's
 * teamMembers (real users in prod, mock team locally).
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  onSubmitShortcut,
}: MentionTextareaProps) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)

  // The "@token" immediately before the caret, if any.
  function detectTrigger(text: string, caret: number) {
    const upto = text.slice(0, caret)
    const match = upto.match(/(?:^|\s)@([\p{L}\p{N}._-]*)$/u)
    return match ? match[1] : null
  }

  const matches = open
    ? teamMembers
        .filter((m) => (m.name || m.email).toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : []

  function handleChange(text: string) {
    onChange(text)
    const caret = ref.current?.selectionStart ?? text.length
    const q = detectTrigger(text, caret)
    if (q !== null) {
      setQuery(q)
      setOpen(true)
      setActiveIdx(0)
    } else {
      setOpen(false)
    }
  }

  function insertMention(m: TeamMember) {
    const el = ref.current
    const caret = el?.selectionStart ?? value.length
    const before = value.slice(0, caret)
    const after = value.slice(caret)
    // Replace the trailing "@query" with "@Name "
    const newBefore = before.replace(/@([\p{L}\p{N}._-]*)$/u, `@${m.name || m.email} `)
    const next = newBefore + after
    onChange(next)
    setOpen(false)
    // Restore focus + caret after the inserted mention
    requestAnimationFrame(() => {
      el?.focus()
      const pos = newBefore.length
      el?.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          if (open && matches.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % matches.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + matches.length) % matches.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(matches[activeIdx]); return }
            if (e.key === 'Escape') { setOpen(false); return }
          }
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmitShortcut?.()
        }}
      />

      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {matches.map((m, i) => {
            const display = m.name || m.email
            return (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(m) }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  i === activeIdx ? 'bg-primary/10' : 'hover:bg-muted'
                )}
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {display[0]?.toUpperCase()}
                </span>
                <span className="font-medium">{display}</span>
                <span className="text-[11px] text-muted-foreground capitalize ml-auto">{m.role}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
