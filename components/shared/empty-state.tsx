import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-10' : 'py-20', className)}>
      <div className={cn('rounded-2xl bg-muted/60 flex items-center justify-center mb-4', compact ? 'w-10 h-10' : 'w-14 h-14')}>
        <Icon className={cn('text-muted-foreground/50', compact ? 'w-5 h-5' : 'w-6 h-6')} />
      </div>
      <p className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-[15px]')}>{title}</p>
      {description && (
        <p className={cn('text-muted-foreground mt-1 max-w-xs leading-relaxed', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && (
        <Button size="sm" className="mt-4 h-8 text-xs gap-1.5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
