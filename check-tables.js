const https = require('https');

const apiKey = 'sb_publishable_dw3cU7CuTDOQCf0m3jGqog_L1qe0tlr';
const baseUrl = 'ujgiaqfuywnrimjjcekb.supabase.co';

function checkTable(table) {
  return new Promise((resolve) => {
    const options = {
      hostname: baseUrl,
      port: 443,
      path: `/rest/v1/${table}?limit=0`,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      const contentRange = res.headers['content-range'];
      const recordCount = contentRange ? contentRange.split('/')[1] : '0';
      
      if (res.statusCode === 200 || res.statusCode === 206) {
        resolve({ table, status: '✅', records: recordCount });
      } else {
        resolve({ table, status: '❌', records: `Error ${res.statusCode}` });
      }
    });

    req.on('error', (error) => {
      resolve({ table, status: '❌', records: error.message });
    });

    req.end();
  });
}

async function verify() {
  console.log('🔍 Verifying Supabase Production Database\n');
  
  const tables = ['companies', 'contact_persons', 'lead_opportunities', 'won_jobs', 'tasks', 'activities', 'staff_members', 'dynamic_op_stages'];
  
  console.log('Table Name                 | Status | Records');
  console.log('─'.repeat(60));
  
  for (const table of tables) {
    const result = await checkTable(table);
    console.log(`${result.table.padEnd(26)} | ${result.status} | ${result.records}`);
  }
}

verify();
