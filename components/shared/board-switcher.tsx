'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { fetchBoardMembers } from '@/lib/supabase/anf-tasks'
import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

/**
 * Board switcher (Phase 4.0) — sits under the sidebar logo. Shows the active
 * board (colour swatch + name); opening it picks the active board, which
 * re-scopes Leads, the Won board, its OP stages, and the Dashboard. Renders
 * nothing until at least one board exists (pre-migration = single implicit
 * board, no switcher).
 */
export function BoardSwitcher() {
  const router = useRouter()
  const boards = useCRMStore((s) => s.boards)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const setActiveBoard = useCRMStore((s) => s.setActiveBoard)

  const { user, role } = useAuth()
  // Restricted boards (e.g. Andy & Fine.) are listed only for members + admins.
  const [memberOf, setMemberOf] = useState<Record<string, string[]>>({})
  const restrictedKey = boards.filter((b) => b.restricted).map((b) => b.board_id).join(',')
  useEffect(() => {
    if (!restrictedKey) return
    let alive = true
    void Promise.all(restrictedKey.split(',').map(async (id) => [id, await fetchBoardMembers(id)] as const))
      .then((pairs) => { if (alive) setMemberOf(Object.fromEntries(pairs)) })
    return () => { alive = false }
  }, [restrictedKey])
  const visible = boards.filter((b) => !b.restricted || role === 'admin' || (!!user && (memberOf[b.board_id] ?? []).includes(user.id)))

  if (visible.length === 0) return null
  const active = visible.find((b) => b.board_id === activeBoardId) ?? visible[0]

  // Each board opens at its own home (structures differ).
  const homeFor = (boardId: string) => (boardId === 'anf-order' ? '/purchasing' : boardId === 'anf' ? '/anf-tasks' : '/dashboard')
  function pick(boardId: string) {
    setActiveBoard(boardId)
    router.push(homeFor(boardId))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors text-left"
        aria-label={`Active board: ${active.name}. Change board`}
      >
        <span className="w-[18px] h-[18px] rounded-md shrink-0" style={{ backgroundColor: active.color }} />
        <span className="flex-1 min-w-0 truncate font-bold text-[13px] text-foreground">{active.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {visible.map((b) => (
          <DropdownMenuItem
            key={b.board_id}
            onClick={() => pick(b.board_id)}
            className="text-sm gap-2.5 cursor-pointer"
          >
            <span className="w-3.5 h-3.5 rounded-[5px] shrink-0" style={{ backgroundColor: b.color }} />
            <span className="flex-1 min-w-0 truncate">{b.name}</span>
            {b.restricted && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
            {b.board_id === active.board_id && <Check className="w-4 h-4 text-foreground shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
