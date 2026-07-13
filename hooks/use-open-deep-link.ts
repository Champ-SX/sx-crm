'use client'

import { useEffect, useRef } from 'react'

/**
 * Opens a record's detail drawer from a `?open=<id>` deep-link (used by the
 * notification bell). Runs once, after data is ready so the record exists in
 * the store, then strips the param so a refresh / closing the drawer doesn't
 * re-open it. If the id is stale/deleted (not found), it's a clean no-op —
 * the user just lands on the list.
 *
 * @param isReady  true once the store data has loaded (e.g. isInitialized)
 * @param exists   returns whether the id is present in the current dataset
 * @param open     opens the detail for the id (e.g. setSelectedId)
 */
export function useOpenDeepLink(
  isReady: boolean,
  exists: (id: string) => boolean,
  open: (id: string) => void,
) {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current || !isReady || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('open')
    if (!id) {
      ran.current = true
      return
    }
    ran.current = true
    if (exists(id)) open(id)
    // Strip ?open regardless (found or stale) so it doesn't linger.
    params.delete('open')
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [isReady, exists, open])
}
