/**
 * Debug script to check:
 * 1. What RLS policies exist on dynamic_op_stages
 * 2. What stages are in the database
 * 3. Try to insert a test stage and see if it works
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
}

async function debugStages() {
  console.log('🔍 Debugging stage persistence issue...\n')

  try {
    // 1. Check current stages in database
    console.log('📋 Fetching all stages from database...')
    const stagesUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages?select=*`
    const stagesResponse = await fetch(stagesUrl, { headers })
    const stages = (await stagesResponse.json()) as any[]
    console.log(`✅ Found ${stages.length} stages in database:`)
    stages.forEach((s) => {
      console.log(`   - ${s.stage_id}: ${s.label} (custom: ${s.is_custom})`)
    })

    // 2. Try to insert a test stage
    console.log('\n🧪 Testing INSERT with a test stage...')
    const testStageId = `TEST_${Date.now()}`
    const testStage = {
      stage_id: testStageId,
      label: 'Test Stage',
      order: 999,
      accent_color: 'blue',
      dot_color: 'blue',
      header_bg: 'bg-blue-50',
      column_bg: 'bg-blue-25',
      is_custom: true,
    }

    console.log(`Attempting to insert: ${JSON.stringify(testStage, null, 2)}`)

    const insertUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages`
    const insertResponse = await fetch(insertUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testStage),
    })

    console.log(`Response status: ${insertResponse.status}`)

    if (insertResponse.ok) {
      const result = await insertResponse.json()
      console.log(`✅ INSERT successful! Result: ${JSON.stringify(result, null, 2)}`)

      // Try to fetch it back
      console.log(`\n🔍 Verifying test stage was saved...`)
      const verifyUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages?stage_id=eq.${testStageId}`
      const verifyResponse = await fetch(verifyUrl, { headers })
      const verifyResult = (await verifyResponse.json()) as any[]
      if (verifyResult.length > 0) {
        console.log(`✅ Test stage found in database!`)
      } else {
        console.log(`❌ Test stage NOT found in database (insert may have failed silently)`)
      }

      // Clean up test stage
      console.log(`\n🧹 Cleaning up test stage...`)
      const deleteUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages?stage_id=eq.${testStageId}`
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers,
      })
    } else {
      const errorText = await insertResponse.text()
      console.log(`❌ INSERT failed!`)
      console.log(`Status: ${insertResponse.status}`)
      console.log(`Error: ${errorText}`)

      // Try to parse error
      try {
        const errorJson = JSON.parse(errorText)
        console.log(`\nError details:`)
        console.log(`  Code: ${errorJson.code}`)
        console.log(`  Message: ${errorJson.message}`)
        console.log(`  Details: ${errorJson.details}`)
        console.log(`  Hint: ${errorJson.hint}`)
      } catch {
        // Not JSON, just raw error
      }
    }

    // 3. Check if there's a trigger or constraint issue
    console.log('\n\n📝 DIAGNOSIS:')
    if (insertResponse.ok) {
      console.log('✅ INSERT works - the issue might be:')
      console.log('   1. Frontend not waiting for the insert to complete')
      console.log('   2. Frontend reloading before insert finishes')
      console.log('   3. Browser cache issue')
    } else {
      console.log('❌ INSERT is failing - the issue is:')
      console.log('   1. RLS policy still blocking inserts')
      console.log('   2. Database constraint or trigger error')
      console.log('   3. Missing required column')
    }
  } catch (error) {
    console.error('❌ Error during debug:', error instanceof Error ? error.message : error)
  }
}

debugStages()
