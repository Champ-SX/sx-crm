'use client'

import { useEffect, useRef } from 'react'

/**
 * Opens a record's detail drawer from a `?open=<id>` deep-link (shared via the
 * card's "Copy link" / "Share" actions). Complements useOpenDeepLink, which
 * handles the in-app notification signal.
 *
 * Reads the param from the URL once data is ready, opens the drawer if the id
 * exists, then strips the param (history.replaceState) so a manual refresh or
 * back-nav doesn't reopen it. Runs once per page load.
 *
 * @param isReady  true once the store data has loaded for this page
 * @param exists   whether the id is present in the current dataset
 * @param open     opens the detail for the id (e.g. setSelectedId)
 */
export function useOpenFromUrl(
  isReady: boolean,
  exists: (id: string) => boolean,
  open: (id: string) => void,
) {
  const consumed = useRef(false)

  useEffect(() => {
    if (consumed.current || !isReady) return
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const id = params.get('open')
    if (!id) {
      consumed.current = true
      return
    }

    consumed.current = true
    if (exists(id)) open(id)

    // Remove the param so refresh/back doesn't re-trigger the drawer.
    params.delete('open')
    const qs = params.toString()
    const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
    window.history.replaceState(null, '', url)
  }, [isReady, exists, open])
}
