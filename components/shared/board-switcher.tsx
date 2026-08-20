'use client'

import { Check, ChevronDown } from 'lucide-react'
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

  if (boards.length === 0) return null
  const active = boards.find((b) => b.board_id === activeBoardId) ?? boards[0]

  // Each board opens at its own home (structures differ).
  const homeFor = (boardId: string) => (boardId === 'anf-order' ? '/anf-order' : '/dashboard')
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
        {boards.map((b) => (
          <DropdownMenuItem
            key={b.board_id}
            onClick={() => pick(b.board_id)}
            className="text-sm gap-2.5 cursor-pointer"
          >
            <span className="w-3.5 h-3.5 rounded-[5px] shrink-0" style={{ backgroundColor: b.color }} />
            <span className="flex-1 min-w-0 truncate">{b.name}</span>
            {b.board_id === active.board_id && <Check className="w-4 h-4 text-foreground shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
