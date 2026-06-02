#!/usr/bin/env node
/**
 * SPRINT 1: CRITICAL-1 - Verify Position Field (JavaScript version)
 * Checks for NULL position values in won_jobs table
 */

const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const url = new URL(supabaseUrl);
const hostname = url.hostname;

function makeRequest(method, path, headers, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verifyPositionField() {
  console.log('🔍 Checking position field in won_jobs table...\n');

  try {
    const headers = {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    };

    // Query for NULL positions
    const response = await makeRequest(
      'GET',
      '/rest/v1/won_jobs?position=is.null&select=id,job_number,op_stage,position',
      headers
    );

    if (response.status !== 200) {
      console.error('❌ Error querying database:', response.data);
      process.exit(1);
    }

    const nullJobs = response.data;
    const nullCount = Array.isArray(nullJobs) ? nullJobs.length : 0;

    console.log(`Found ${nullCount} jobs with NULL position values`);

    if (nullCount === 0) {
      console.log('✅ Position field is clean - no NULLs found');
      console.log('✅ CRITICAL-1 VERIFICATION PASSED');
      process.exit(0);
    }

    // Show NULL positions
    console.log('\n⚠️  NULL position values found:');
    nullJobs.forEach((job) => {
      console.log(`  - Job ${job.job_number} (${job.op_stage}): position = NULL`);
    });

    console.log('\n💡 Run verify-position:fix to auto-repair');
    process.exit(1);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

verifyPositionField();
