const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ujgiaqfuywnrimjjcekb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeImport() {
  try {
    const sql = fs.readFileSync('/tmp/sx_crm_import.sql', 'utf8');
    
    console.log('📊 Starting Thai Contact Data Import...\n');
    console.log(`📄 SQL File Size: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Split and execute each statement
    const statements = sql.split('BEGIN TRANSACTION;')[1].split('COMMIT;')[0].trim().split(';').filter(s => s.trim());
    
    console.log(`📝 Found ${statements.length} SQL statements\n`);
    
    // Since we can't execute raw SQL directly with the anon key,
    // we need to use the database connection differently
    // Let's try via the service role approach
    
    // For now, let's check the current counts
    const { data: companyCurrent, error: err1 } = await supabase
      .from('company')
      .select('count()', { count: 'exact' });
      
    const { data: contactCurrent, error: err2 } = await supabase
      .from('contact_person')
      .select('count()', { count: 'exact' });
    
    console.log('Current database state:');
    console.log(`- Companies: ${companyCurrent ? companyCurrent.length : 'N/A'}`);
    console.log(`- Contacts: ${contactCurrent ? contactCurrent.length : 'N/A'}\n`);
    
    console.log('⚠️  Direct SQL execution not available with anon key.');
    console.log('Use Supabase SQL Editor at: https://app.supabase.com/project/ujgiaqfuywnrimjjcekb/sql/new');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

executeImport();
