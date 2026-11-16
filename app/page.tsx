'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ACTIVE_BOARD_KEY, boardHome } from '@/lib/boards-nav'

// Open on the home page of the board used last, so page and sidebar menu match.
export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    let saved: string | null = null
    try { saved = window.localStorage.getItem(ACTIVE_BOARD_KEY) } catch { /* ignore */ }
    router.replace(boardHome(saved))
  }, [router])
  return null
}
