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
export function transformStageFromDB(rawStage: any): DynamicOPStage {
  return {
    id: rawStage.stage_id || rawStage.id,
    label: rawStage.label,
    order: rawStage.order,
    accentColor: rawStage.accent_color || rawStage.accentColor || '',
    dotColor: rawStage.dot_color || rawStage.dotColor || '',
    headerBg: rawStage.header_bg || rawStage.headerBg || '',
    columnBg: rawStage.column_bg || rawStage.columnBg || '',
    isCustom: rawStage.is_custom !== undefined ? rawStage.is_custom : rawStage.isCustom ?? false,
  }
}

/**
 * Transform multiple stages from database format
 */
export function transformStagesFromDB(stages: any[]): DynamicOPStage[] {
  return stages.map(transformStageFromDB)
}
