/**
 * Transformers to convert Supabase REST API responses (snake_case)
 * to TypeScript types (camelCase)
 */

import type { DynamicOPStage } from '@/types'

/**
 * Transform a stage from snake_case (database) to camelCase (TypeScript)
 * Database: { stage_id, is_custom, accent_color, dot_color, header_bg, column_bg }
 * TypeScript: { id, isCustom, accentColor, dotColor, headerBg, columnBg }
 */
// Rows come in either DB (snake_case) or app (camelCase) shape.
type RawStage = Partial<DynamicOPStage> & { stage_id?: string; accent_color?: string; dot_color?: string; header_bg?: string; column_bg?: string; is_custom?: boolean; board_id?: string }

export function transformStageFromDB(rawStage: RawStage): DynamicOPStage {
  return {
    id: (rawStage.stage_id || rawStage.id) as string,
    label: rawStage.label as string,
    order: rawStage.order as number,
    accentColor: rawStage.accent_color || rawStage.accentColor || '',
    dotColor: rawStage.dot_color || rawStage.dotColor || '',
    headerBg: rawStage.header_bg || rawStage.headerBg || '',
    columnBg: rawStage.column_bg || rawStage.columnBg || '',
    isCustom: rawStage.is_custom !== undefined ? rawStage.is_custom : rawStage.isCustom ?? false,
    boardId: rawStage.board_id ?? rawStage.boardId ?? undefined,
  }
}

/**
 * Transform multiple stages from database format
 */
export function transformStagesFromDB(stages: RawStage[]): DynamicOPStage[] {
  return stages.map(transformStageFromDB)
}
