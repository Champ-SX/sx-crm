'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PortalView } from '@/components/portal/portal-view'

const VALID = ['sixsheet', 'captures', 'andyfine', 'sxtech']

function PortalPageInner() {
  const params = useSearchParams()
  const q = params.get('company')
  const company = q && VALID.includes(q) ? q : 'sixsheet'
  return <PortalView key={company} initialCompany={company} />
}

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <PortalPageInner />
    </Suspense>
  )
}
