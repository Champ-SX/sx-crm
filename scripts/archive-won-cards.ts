const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
}

async function archiveWonCards() {
  console.log('🔄 Starting Won cards archive process...\n')

  try {
    // Step 1: Get all jobs in WON_JOB_LIST stage
    console.log('📋 Fetching all jobs in WON_JOB_LIST stage...')
    const fetchUrl = `${SUPABASE_URL}/rest/v1/won_jobs?op_stage=eq.WON_JOB_LIST&select=*`
    const fetchResponse = await fetch(fetchUrl, { headers })

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch jobs: ${fetchResponse.statusText}`)
    }

    const wonJobs = (await fetchResponse.json()) as any[]
    console.log(`✅ Found ${wonJobs.length} jobs to archive\n`)

    if (wonJobs.length === 0) {
      console.log('✨ No jobs to archive. Won board is already clean!')
      return
    }

    // Step 2: Check if Archived stage exists
    console.log('🔍 Checking if Archived stage exists...')
    const stageCheckUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages?select=*&stage_id=eq.ARCHIVED`
    const stageCheckResponse = await fetch(stageCheckUrl, { headers })

    if (!stageCheckResponse.ok) {
      const errorText = await stageCheckResponse.text()
      throw new Error(`Failed to check stage: ${stageCheckResponse.statusText} - ${errorText}`)
    }

    const existingStages = (await stageCheckResponse.json()) as any[]
    let archiveStage = existingStages[0]

    if (!archiveStage) {
      console.log('📌 Creating Archived stage...')
      const createStageUrl = `${SUPABASE_URL}/rest/v1/dynamic_op_stages`
      const createStageResponse = await fetch(createStageUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          stage_id: 'ARCHIVED',
          label: 'Archived',
          order: 999,
          accent_color: 'gray',
          dot_color: 'gray',
          header_bg: 'bg-gray-50',
          column_bg: 'bg-gray-25',
          is_custom: false,
        }),
      })

      if (!createStageResponse.ok) {
        const errorText = await createStageResponse.text()
        throw new Error(`Failed to create stage: ${createStageResponse.statusText} - ${errorText}`)
      }

      const responseText = await createStageResponse.text()
      const createdStages = responseText ? (JSON.parse(responseText) as any[]) : []
      archiveStage = createdStages[0] || { stage_id: 'ARCHIVED', label: 'Archived' }
      console.log('✅ Archived stage created\n')
    } else {
      console.log('✅ Archived stage already exists\n')
    }

    // Step 3: Move all jobs to Archived stage
    console.log(`🚀 Moving ${wonJobs.length} jobs to Archived stage...`)
    const updateUrl = `${SUPABASE_URL}/rest/v1/won_jobs?op_stage=eq.WON_JOB_LIST`
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        op_stage: 'ARCHIVED',
        updated_at: new Date().toISOString(),
      }),
    })

    if (!updateResponse.ok) {
      throw new Error(`Failed to move jobs: ${updateResponse.statusText}`)
    }

    console.log(`✅ Successfully moved ${wonJobs.length} jobs to Archived!\n`)

    // Step 4: Verify
    console.log('🔍 Verifying archive...')
    const verifyWonUrl = `${SUPABASE_URL}/rest/v1/won_jobs?op_stage=eq.WON_JOB_LIST&select=job_id`
    const verifyWonResponse = await fetch(verifyWonUrl, { headers })
    const verifyWon = await verifyWonResponse.json() as any[]

    const verifyArchivedUrl = `${SUPABASE_URL}/rest/v1/won_jobs?op_stage=eq.ARCHIVED&select=job_id`
    const verifyArchivedResponse = await fetch(verifyArchivedUrl, { headers })
    const verifyArchived = await verifyArchivedResponse.json() as any[]

    console.log(`📊 WON_JOB_LIST stage now has: ${verifyWon.length} jobs`)
    console.log(`📊 ARCHIVED stage now has: ${verifyArchived.length} jobs\n`)

    console.log('✨ Archive complete! Your Won board is clean and ready for Phase 2.')
  } catch (error) {
    console.error('❌ Error archiving Won cards:', error)
    process.exit(1)
  }
}

archiveWonCards()
