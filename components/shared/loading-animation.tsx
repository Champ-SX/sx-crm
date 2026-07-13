'use client'

import Lottie from 'lottie-react'
import animationData from './loading-animation.json'

/**
 * Brand loading animation.
 *
 * Plays the Lottie in `loading-animation.json` when it's a real export from
 * `6-Loadingai.aep` (LottieFiles/Bodymovin). The artwork is black, so it's
 * inverted in dark mode to stay visible on the charcoal background. Until a
 * valid export is dropped in (placeholder is `{}`), it falls back to a clean
 * CSS spinner so nothing breaks.
 */
export function LoadingAnimation({
  size = 96,
  label = 'Loading…',
  className = '',
}: {
  size?: number
  label?: string
  className?: string
}) {
  const data = animationData as { layers?: unknown[] }
  const hasLottie = Array.isArray(data.layers) && data.layers.length > 0

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {hasLottie ? (
        <div className="dark:invert" style={{ width: size, height: size }}>
          <Lottie animationData={data} loop autoplay style={{ width: size, height: size }} />
        </div>
      ) : (
        <div
          className="rounded-lg border-2 border-muted-foreground/20 border-t-primary animate-spin"
          style={{ width: size * 0.42, height: size * 0.42 }}
        />
      )}
      {label && <p className="mt-4 text-muted-foreground text-sm">{label}</p>}
    </div>
  )
}
