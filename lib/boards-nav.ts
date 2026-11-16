// Which board a page belongs to, and each board's home page.
export const ACTIVE_BOARD_KEY = 'sx-active-board'
export const boardHome = (boardId: string | null) => (boardId === 'anf-order' ? '/inventory' : boardId === 'anf' ? '/anf-tasks' : '/dashboard')
/** null = shared page (settings, sales, admin, portal…) that fits any board. */
export function boardOfPath(path: string): string | null {
  if (path.startsWith('/inventory')) return 'anf-order'
  if (path.startsWith('/anf-tasks')) return 'anf'
  if (/^\/(dashboard|customers|leads-opportunities|won-ready-op|staff|tasks|import)(\/|$)/.test(path)) return 'captures'
  return null
}
