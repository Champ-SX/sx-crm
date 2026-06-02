import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ujgiaqfuywnrimjjcekb.supabase.co'
const supabaseKey = 'sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase Production Database...\n')
  
  try {
    // Check all tables
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tableError) throw tableError
    
    console.log('✅ Connected to Supabase Project')
    console.log(`📊 Tables found: ${tables.length}`)
    console.log('Tables:')
    tables.forEach(t => console.log(`   - ${t.table_name}`))
    
    // Check companies table
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('count()', { count: 'exact' })
    
    if (!companyError) {
      console.log(`\n📦 Data count - Companies: ${companies[0].count || 0} records`)
    }
    
    // Check contact_persons table
    const { data: contacts, error: contactError } = await supabase
      .from('contact_persons')
      .select('count()', { count: 'exact' })
    
    if (!contactError) {
      console.log(`   - Contact Persons: ${contacts[0].count || 0} records`)
    }
    
    // Check lead_opportunities table
    const { data: leads, error: leadError } = await supabase
      .from('lead_opportunities')
      .select('count()', { count: 'exact' })
    
    if (!leadError) {
      console.log(`   - Lead Opportunities: ${leads[0].count || 0} records`)
    }
    
    // Check won_jobs table
    const { data: jobs, error: jobError } = await supabase
      .from('won_jobs')
      .select('count()', { count: 'exact' })
    
    if (!jobError) {
      console.log(`   - Won Jobs: ${jobs[0].count || 0} records`)
    }
    
    console.log('\n✅ Database verification complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

verifyDatabase()
