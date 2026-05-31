'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to prevent hydration mismatch issues in Next.js SSR.
 *
 * Without localStorage persistence, this simply returns false during SSR
 * and true after client-side mount, ensuring components don't render
 * mismatched content between server and client.
 *
 * Usage:
 * ```tsx
 * const isHydrated = useHydrated()
 * if (!isHydrated) return null  // Don't render until client-side mount
 * ```
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // After component mounts on the client, mark as hydrated
    // This prevents SSR/client mismatch by not rendering until we're on the client
    setIsHydrated(true)
  }, [])

  return isHydrated
}
