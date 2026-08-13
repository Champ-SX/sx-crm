'use client'

/**
 * Minimal, dependency-free toast. Renders a transient pill at the bottom-center
 * of the screen. No provider/context needed — safe to call from any client
 * handler. Used for lightweight feedback ("Link copied", "Card archived").
 */
export function toast(message: string) {
  if (typeof document === 'undefined') return

  let host = document.getElementById('sx-toast-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'sx-toast-host'
    host.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1000;' +
      'display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;'
    document.body.appendChild(host)
  }

  const pill = document.createElement('div')
  pill.textContent = message
  pill.style.cssText =
    'background:var(--foreground,#111);color:var(--background,#fff);' +
    'font:500 13px/1.2 system-ui,sans-serif;padding:10px 16px;border-radius:9999px;' +
    'box-shadow:0 6px 24px rgba(0,0,0,.18);opacity:0;transform:translateY(6px);' +
    'transition:opacity .18s ease,transform .18s ease;max-width:90vw;text-align:center;'
  host.appendChild(pill)

  // enter
  requestAnimationFrame(() => {
    pill.style.opacity = '1'
    pill.style.transform = 'translateY(0)'
  })

  // exit + cleanup
  window.setTimeout(() => {
    pill.style.opacity = '0'
    pill.style.transform = 'translateY(6px)'
    window.setTimeout(() => {
      pill.remove()
      if (host && !host.childElementCount) host.remove()
    }, 220)
  }, 2200)
}
