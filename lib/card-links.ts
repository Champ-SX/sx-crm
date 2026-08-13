'use client'

import { toast } from '@/lib/toast'

export type LinkableEntity = 'customer' | 'lead_opportunity' | 'won_job'

export const ENTITY_ROUTE: Record<LinkableEntity, string> = {
  customer: '/customers',
  lead_opportunity: '/leads-opportunities',
  won_job: '/won-ready-op',
}

/**
 * Deep-link URL for a card. Opening it lands on the card's board with
 * `?open=<id>`, which the page reads (useOpenFromUrl) to pop the detail drawer.
 */
export function cardUrl(entityType: LinkableEntity, id: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${ENTITY_ROUTE[entityType]}?open=${encodeURIComponent(id)}`
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy path */
  }
  // Legacy fallback (older Safari / insecure contexts)
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/** Copy the card's deep-link to the clipboard, with toast feedback. */
export async function copyCardLink(entityType: LinkableEntity, id: string) {
  const ok = await writeClipboard(cardUrl(entityType, id))
  toast(ok ? 'Link copied' : 'Could not copy link')
}

/**
 * Share the card's deep-link via the native share sheet when available
 * (mobile), otherwise fall back to copying it.
 */
export async function shareCardLink(entityType: LinkableEntity, id: string, title?: string) {
  const url = cardUrl(entityType, id)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: title || 'SX CRM', url })
      return
    } catch (err) {
      // User cancelled the share sheet — do nothing, no fallback toast.
      if (err instanceof DOMException && err.name === 'AbortError') return
      // Any other failure → fall back to copy.
    }
  }
  const ok = await writeClipboard(url)
  toast(ok ? 'Link copied' : 'Could not share link')
}
