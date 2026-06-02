import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function purgeAllData() {
  try {
    console.log('Starting data purge...');

    // Delete in order of foreign key dependencies
    const tables = [
      'activities',
      'tasks',
      'won_jobs',
      'lead_opportunities',
      'contact_persons',
      'companies',
      'tags',
      'staff_members',
    ];

    for (const table of tables) {
      console.log(`Purging ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) {
        console.error(`Error purging ${table}:`, error.message);
      } else {
        console.log(`✓ ${table} purged`);
      }
    }

    console.log('Data purge complete!');
  } catch (error) {
    console.error('Purge failed:', error);
    process.exit(1);
  }
}

purgeAllData();
