'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'

type EntityType = 'customer' | 'lead_opportunity' | 'won_job'

/**
 * Opens a record's detail drawer when the notification bell requests it
 * (`requestOpenEntity` → `pendingOpen` in the store). Reactive to the store, so
 * it fires on EVERY notification click — including when you're already on the
 * target page (the old URL-param approach only ran once per mount).
 *
 * Waits until data is loaded so the record exists; clears the signal once
 * consumed. Stale/deleted ids are a clean no-op (drawer just doesn't open).
 *
 * @param isReady     true once the store data has loaded for this page
 * @param entityType  the entity this page handles
 * @param exists      whether the id is present in the current dataset
 * @param open        opens the detail for the id (e.g. setSelectedId)
 */
export function useOpenDeepLink(
  isReady: boolean,
  entityType: EntityType,
  exists: (id: string) => boolean,
  open: (id: string) => void,
) {
  const pendingOpen = useCRMStore((s) => s.pendingOpen)
  const clearPendingOpen = useCRMStore((s) => s.clearPendingOpen)

  useEffect(() => {
    if (!pendingOpen || pendingOpen.entityType !== entityType) return
    // Wait for data; keep the signal so this re-runs once isReady flips true.
    if (!isReady) return
    if (exists(pendingOpen.entityId)) open(pendingOpen.entityId)
    clearPendingOpen()
  }, [pendingOpen, isReady, entityType, exists, open, clearPendingOpen])
}
