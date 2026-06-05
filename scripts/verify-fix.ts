/**
 * Verify the field transformation fix works
 */

import { transformStageFromDB, transformStagesFromDB } from '../lib/supabase/transformers'

// Simulate a stage coming from the database (snake_case)
const dbStage = {
  stage_id: 'custom_1780396984085',
  label: 'AC - กำลังเก็บเงิน',
  order: 999,
  accent_color: 'gray',
  dot_color: 'gray',
  header_bg: 'bg-gray-50',
  column_bg: 'bg-gray-25',
  is_custom: true,
  created_at: '2026-06-05T14:00:00.000000',
  updated_at: '2026-06-05T14:00:00.000000',
}

console.log('🔍 Testing field transformation...\n')

console.log('📋 Input (from database - snake_case):')
console.log(JSON.stringify(dbStage, null, 2))

const transformed = transformStageFromDB(dbStage)

console.log('\n✨ Transformed (camelCase):')
console.log(JSON.stringify(transformed, null, 2))

console.log('\n✅ Field verification:')
console.log(`  id: ${transformed.id}`)
console.log(`  label: ${transformed.label}`)
console.log(`  isCustom: ${transformed.isCustom} (should be true)`)
console.log(`  accentColor: ${transformed.accentColor}`)

console.log('\n🎯 Filter test (like in the page):')
const stages = [transformed]
const customStageIds = stages
  .filter((s) => s.isCustom)
  .map((s) => s.id)

if (customStageIds.length > 0) {
  console.log(`✅ Custom stages FOUND: ${customStageIds.join(', ')}`)
  console.log('   Stages will now PERSIST on page refresh! 🎉')
} else {
  console.log(`❌ Custom stages NOT FOUND (filter still broken)`)
}
