import fetch from 'node-fetch' || 'axios'

const apiKey = 'sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr'
const baseUrl = 'https://ujgiaqfuywnrimjjcekb.supabase.co/rest/v1'

async function checkTables() {
  console.log('🔍 Checking Supabase Database Tables...\n')
  
  const tables = ['companies', 'contact_persons', 'lead_opportunities', 'won_jobs', 'tasks', 'activities', 'staff_members', 'dynamic_op_stages']
  
  for (const table of tables) {
    try {
      const response = await fetch(`${baseUrl}/${table}?limit=0`, {
        headers: { 
          'apikey': apiKey,
          'Accept': 'application/json'
        }
      })
      
      const count = response.headers.get('content-range')?.split('/')[-1] || 'unknown'
      
      if (response.ok) {
        console.log(`✅ ${table.padEnd(25)} - exists (${count} records)`)
      } else {
        console.log(`❌ ${table.padEnd(25)} - error: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${table.padEnd(25)} - ${error.message}`)
    }
  }
}

checkTables()
