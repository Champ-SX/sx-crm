/**
 * Test what field names come back from Supabase for dynamic_op_stages
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
}

async function testFieldNames() {
  console.log('🔍 Checking what field names come back from Supabase...\n')

  try {
    const url = `${SUPABASE_URL}/rest/v1/dynamic_op_stages?limit=1&select=*`
    const response = await fetch(url, { headers })
    const stages = (await response.json()) as any[]

    if (stages.length === 0) {
      console.log('❌ No stages found')
      return
    }

    const stage = stages[0]
    console.log('📋 First stage from REST API:')
    console.log(JSON.stringify(stage, null, 2))

    console.log('\n📊 Field names analysis:')
    Object.keys(stage).forEach((key) => {
      const hasUnderscore = key.includes('_')
      const format = hasUnderscore ? 'snake_case ❌' : 'camelCase ✅'
      console.log(`  ${key}: ${format}`)
    })

    console.log('\n🔍 Looking for custom stages...')
    const customStages = stages.filter((s: any) => s.is_custom || s.isCustom)
    console.log(`Found ${customStages.length} custom stages`)
    customStages.forEach((s: any) => {
      console.log(`  - ${s.stage_id || s.id}: ${s.label} (is_custom: ${s.is_custom}, isCustom: ${s.isCustom})`)
    })
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
  }
}

testFieldNames()
