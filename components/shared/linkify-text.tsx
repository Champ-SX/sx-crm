'use client'

import type { ReactNode } from 'react'
import { useCRMStore } from '@/store/crm-store'

/**
 * LinkifyText Component
 * Renders note/activity text with two kinds of highlights:
 *  - URLs (http://, https://, www.) → clickable blue links
 *  - @mentions of real team members → brand-colored pill (Option A)
 * Mentions are matched the same way as parseMentions (case-insensitive,
 * longest name first) so only actual teammates are highlighted; a typed
 * "@someone" who isn't on the team stays plain text. Render-only — the stored
 * text is unchanged.
 */

type Segment = { start: number; end: number; type: 'link' | 'mention'; url?: string }

export function LinkifyText({ text }: { text: string }) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  if (!text) return null

  const segments: Segment[] = []

  // URLs (claimed first so a mention never overlaps a link)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g
  let urlMatch: RegExpExecArray | null
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    const raw = urlMatch[0]
    segments.push({
      start: urlMatch.index,
      end: urlMatch.index + raw.length,
      type: 'link',
      url: raw.startsWith('http') ? raw : 'https://' + raw,
    })
  }

  // @mentions — longest handles first so "@Andy Fine" wins over "@Andy"
  const handles = teamMembers
    .map((m) => '@' + (m.name || m.email))
    .filter((h) => h.length > 1)
    .sort((a, b) => b.length - a.length)
  const lower = text.toLowerCase()
  for (const handle of handles) {
    const hl = handle.toLowerCase()
    let from = 0
    let idx: number
    while ((idx = lower.indexOf(hl, from)) !== -1) {
      const end = idx + hl.length
      from = end
      // Require a word boundary after the name (so "@Andy" doesn't match inside "@Andyx")
      const after = text[end]
      if (after && /[\p{L}\p{N}]/u.test(after)) continue
      // Skip if this range overlaps an already-claimed URL or longer mention
      if (segments.some((s) => idx < s.end && end > s.start)) continue
      segments.push({ start: idx, end, type: 'mention' })
    }
  }

  if (segments.length === 0) return <span>{text}</span>
  segments.sort((a, b) => a.start - b.start)

  const out: ReactNode[] = []
  let last = 0
  segments.forEach((seg, i) => {
    if (seg.start > last) out.push(<span key={`t${i}`}>{text.slice(last, seg.start)}</span>)
    const content = text.slice(seg.start, seg.end)
    if (seg.type === 'link') {
      out.push(
        <a
          key={i}
          href={seg.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
          onClick={(e) => e.stopPropagation()}
          title={`Open ${seg.url}`}
        >
          {content}
        </a>
      )
    } else {
      out.push(
        <span
          key={i}
          className="bg-primary/10 text-primary font-medium rounded px-1.5 py-0.5 whitespace-nowrap"
        >
          {content}
        </span>
      )
    }
    last = seg.end
  })
  if (last < text.length) out.push(<span key="end">{text.slice(last)}</span>)

  return <>{out}</>
}
