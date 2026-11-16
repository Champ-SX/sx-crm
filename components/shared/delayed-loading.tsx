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
