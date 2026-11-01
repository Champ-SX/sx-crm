'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StockView } from '@/components/anf/stock-view'

export default function SuppliesPage() {
  const router = useRouter()
  // Older equipment links (/purchasing/stock or /inventory/stock?asset=CAM-001) now live under Equipment.
  const asset = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('asset')
  useEffect(() => { if (asset) router.replace(`/inventory/equipment?asset=${encodeURIComponent(asset)}`) }, [asset, router])
  if (asset) return null
  return <StockView kind="supply" />
}
