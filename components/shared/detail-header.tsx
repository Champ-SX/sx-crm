'use client'

import { X, Plus, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

export interface MetaCell {
  label: string
  node: React.ReactNode
}
export interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

function IconMenu({ trigger, label, items }: { trigger: React.ReactNode; label: string; items: ActionItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {items.map((it, i) => (
          <DropdownMenuItem
            key={i}
            onClick={it.onClick}
            className={`text-sm gap-2.5 cursor-pointer ${it.danger ? 'text-destructive focus:text-destructive' : ''}`}
          >
            {it.icon}
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Unified detail-drawer header shared by Won / Leads / Customers.
 * Structure (matches the approved mock):
 *   • Top action row — [X close] · #id · date … [＋ add] [⋯ actions]
 *   • Title + subtitle
 *   • Metadata row — labeled cells (owner · stage · value · due …) spread evenly
 * Destructive/utility actions live in the ⋯ menu (Delete always last); the
 * close X sits in its own band so it never overlaps content.
 */
export function DetailHeader({
  idChip,
  dateLabel,
  title,
  subtitle,
  meta,
  onClose,
  actions,
  addItems,
}: {
  idChip?: string
  dateLabel?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: MetaCell[]
  onClose: () => void
  actions?: ActionItem[]
  addItems?: ActionItem[]
}) {
  return (
    <div className="border-b border-border bg-card shrink-0">
      {/* Top action row — X never overlaps content (its own band). */}
      <div className="flex items-center gap-2 px-3 sm:px-6 py-2.5">
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
        {idChip && (
          <span className="font-mono text-[12px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md shrink-0">#{idChip}</span>
        )}
        {dateLabel && <span className="text-[12px] text-muted-foreground shrink-0">{dateLabel}</span>}
        <div className="ml-auto flex items-center gap-0.5">
          {addItems && addItems.length > 0 && <IconMenu trigger={<Plus className="w-[18px] h-[18px]" />} label="Add" items={addItems} />}
          {actions && actions.length > 0 && <IconMenu trigger={<MoreHorizontal className="w-[18px] h-[18px]" />} label="More" items={actions} />}
        </div>
      </div>

      {/* Title + subtitle + metadata row */}
      <div className="px-4 sm:px-6 pb-3.5">
        <div className="text-title">{title}</div>
        {subtitle && <div className="text-subtitle mt-0.5">{subtitle}</div>}
        {meta && meta.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
            {meta.map((m, i) => (
              <div key={i} className="min-w-0">
                <p className="field-label">{m.label}</p>
                <div className="text-sm text-foreground">{m.node}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
