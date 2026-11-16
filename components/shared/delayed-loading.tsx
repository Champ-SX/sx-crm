'use client'

import { useEffect, useState } from 'react'
import { LoadingAnimation } from '@/components/shared/loading-animation'

/** Loading animation that only appears if loading takes longer than `delay` ms — fast loads don't flash. */
export function DelayedLoading({ delay = 150, label = 'Loading…', className = 'py-16' }: { delay?: number; label?: string; className?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  if (!show) return <div className={className} aria-busy="true" />
  return <div className={className} aria-busy="true" role="status"><LoadingAnimation size={72} label={label} /></div>
}

/** Dims the page area (parent must be `relative`) with a centred loading card. Sidebar stays usable. */
export function LoadingOverlay({ label = 'Loading…', delay = 150 }: { label?: string; delay?: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div aria-busy="true" role="status" aria-label={label}
      className={`absolute inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-[1.5px] transition-opacity duration-150 dark:bg-black/55 ${show ? 'opacity-100' : 'pointer-events-auto opacity-0'}`}>
      <div className="rounded-2xl border border-border bg-card px-7 py-4 text-center shadow-lg">
        <LoadingAnimation size={64} label="" />
        <p className="mt-1 text-[13px] font-semibold">{label}</p>
        <p className="text-[11.5px] text-muted-foreground">just a moment</p>
      </div>
    </div>
  )
}
