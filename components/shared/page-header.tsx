import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-8 py-4 bg-white border-b border-border shrink-0',
      className
    )}>
      <div>
        <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight leading-tight">{title}</h1>
        {description && (
          <p className="text-[12px] text-slate-400 mt-0.5 leading-tight">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
