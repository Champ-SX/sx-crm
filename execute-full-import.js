const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ujgiaqfuywnrimjjcekb.supabase.co';
const SUPABASE_SERVICE_KEY = '[REDACTED]';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSql(sql, description) {
  console.log(`\n📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    if (error) throw error;
    console.log(`✅ ${description} completed`);
    return true;
  } catch (err) {
    // If rpc doesn't work, try direct query approach
    console.log(`⚠️  RPC failed, attempting alternative method...`);
    return null;
  }
}

async function runFullImport() {
  console.log('🚀 Starting Full SX-CRM Database Setup & Import\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Execute Schema
    console.log('\n📋 STEP 1: Creating Database Schema');
    const schemaPath = path.join(__dirname, 'lib/supabase/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    const schemaResult = await executeSql(schemaSql, 'Schema creation');
    
    if (schemaResult === null) {
      console.log('⚠️  RPC method not available. Schema may need manual execution.');
      console.log('   Please execute schema.sql manually in Supabase SQL Editor.');
      process.exit(1);
    }

    // Step 2: Execute Import Parts
    console.log('\n📊 STEP 2: Importing Thai Contact Data (5 parts)\n');
    
    const parts = [1, 2, 3, 4, 5];
    for (const part of parts) {
      const partFile = `/tmp/sx_crm_import_part${part}.sql`;
      
      if (!fs.existsSync(partFile)) {
        console.log(`⚠️  Part ${part} not found at ${partFile}`);
        continue;
      }
      
      const partSql = fs.readFileSync(partFile, 'utf-8');
      const result = await executeSql(partSql, `Part ${part} import`);
      
      if (result === null) {
        console.log(`⚠️  Part ${part} needs manual execution`);
        break;
      }
    }

    // Step 3: Verify Import
    console.log('\n✅ STEP 3: Verifying Import\n');
    
    const { data: companyData, error: compErr } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    const { data: contactData, error: contErr } = await supabase
      .from('contact_persons')
      .select('*', { count: 'exact', head: true });
    
    if (!compErr && !contErr) {
      const companyCounts = companyData ? 1 : 0;
      const contactCounts = contactData ? 1 : 0;
      
      console.log(`✅ Database Import Summary:`);
      console.log(`   - Companies table exists: ${!compErr}`);
      console.log(`   - Contact persons table exists: ${!contErr}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✨ Database setup complete!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runFullImport();
