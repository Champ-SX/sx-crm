/**
 * Fix RLS policies for dynamic_op_stages table
 * Allows both anon and authenticated users to create/update/delete custom stages
 *
 * This fixes the issue where custom stages disappear on page refresh
 * because the RLS policy was checking for 'authenticated' role (not 'anon')
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
}

async function fixRLS() {
  console.log('🔧 Fixing RLS policies for dynamic_op_stages...\n')

  try {
    // Drop and recreate INSERT policy
    console.log('📌 Updating INSERT policy...')
    const sql = `
      DROP POLICY IF EXISTS "Allow authenticated users to insert dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to insert dynamic_op_stages"
        ON dynamic_op_stages FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to update dynamic_op_stages"
        ON dynamic_op_stages FOR UPDATE
        USING (true)
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to delete dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to delete dynamic_op_stages"
        ON dynamic_op_stages FOR DELETE
        USING (true);
    `

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql }),
    })

    if (!response.ok) {
      // Try alternative approach - this might not work, but worth trying
      console.log('⚠️  Direct RLS update not available via REST API')
      console.log('\n📚 Please manually apply these SQL queries in Supabase Dashboard:')
      console.log('\nSQL to run:')
      console.log(sql)
      console.log('\nSteps:')
      console.log('1. Go to https://app.supabase.com')
      console.log('2. Select your project')
      console.log('3. Go to SQL Editor')
      console.log('4. Click "New Query"')
      console.log('5. Paste the SQL above and click Run')
      return
    }

    console.log('✅ RLS policies updated successfully!\n')
    console.log('Now custom stages will be saved to the database.')
    console.log('Try creating "AC - เก็บเงิน" and "ALL DONE" stages again - they should persist on page refresh!')
  } catch (error) {
    console.error('❌ Error updating RLS:', error instanceof Error ? error.message : error)
    console.log('\n📚 To fix manually:')
    console.log('1. Go to https://app.supabase.com')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor → New Query')
    console.log('4. Paste this SQL:')
    console.log(`
      DROP POLICY IF EXISTS "Allow authenticated users to insert dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to insert dynamic_op_stages"
        ON dynamic_op_stages FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to update dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to update dynamic_op_stages"
        ON dynamic_op_stages FOR UPDATE
        USING (true)
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Allow authenticated users to delete dynamic_op_stages" ON dynamic_op_stages;
      CREATE POLICY "Allow all users to delete dynamic_op_stages"
        ON dynamic_op_stages FOR DELETE
        USING (true);
    `)
    process.exit(1)
  }
}

fixRLS()
