/**
 * Board scoping (Phase 4.0). A row belongs to the active board when its
 * board_id matches. Two safety rules so nothing ever disappears:
 *   - no active board (pre-migration / boards table absent) → show everything
 *   - a row with no board_id (not yet backfilled) → show on every board
 * Once the migration backfills board_id, scoping is exact.
 */
export function matchesBoard(
  rowBoardId: string | null | undefined,
  activeBoardId: string | null,
): boolean {
  if (!activeBoardId) return true
  if (!rowBoardId) return true
  return rowBoardId === activeBoardId
}
