#!/usr/bin/env node
/**
 * SPRINT 1: CRITICAL-1 - Verify Position Field
 * Checks for NULL position values in won_jobs table
 * Optionally runs migration to fix if found
 *
 * Usage:
 *   npm run verify-position [--fix]
 *
 * Without --fix: Just reports status
 * With --fix: Runs migration if NULLs found
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const shouldFix = process.argv.includes('--fix')

async function verifyPositionField() {
  console.log('🔍 Checking position field in won_jobs table...\n')

  try {
    // Check for NULL positions
    const { data: nullCheck, error: nullError } = await supabase
      .from('won_jobs')
      .select('id, job_number, op_stage, position', { count: 'exact' })
      .is('position', null)

    if (nullError) {
      console.error('❌ Error querying database:', nullError.message)
      process.exit(1)
    }

    const nullCount = nullCheck?.length || 0
    console.log(`Found ${nullCount} jobs with NULL position values`)

    if (nullCount === 0) {
      console.log('✅ Position field is clean - no NULLs found')
      console.log('✅ CRITICAL-1 VERIFICATION PASSED')
      process.exit(0)
    }

    // Show NULL positions
    console.log('\n⚠️  NULL position values found:')
    nullCheck?.forEach((job: any) => {
      console.log(`  - Job ${job.job_number} (${job.op_stage}): position = NULL`)
    })

    if (!shouldFix) {
      console.log('\n💡 Run with --fix to auto-repair')
      process.exit(1)
    }

    // Run migration
    console.log('\n🔧 Running migration to fix NULL positions...')

    const { error: migrationError } = await supabase.rpc('fix_null_positions')

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError.message)
      process.exit(1)
    }

    console.log('✅ Migration completed')

    // Verify
    const { data: verifyCheck, error: verifyError } = await supabase
      .from('won_jobs')
      .select('id', { count: 'exact' })
      .is('position', null)

    if (verifyError) {
      console.error('❌ Verification query failed:', verifyError.message)
      process.exit(1)
    }

    const stillNull = verifyCheck?.length || 0
    if (stillNull === 0) {
      console.log('✅ CRITICAL-1 VERIFICATION PASSED - All positions populated')
      process.exit(0)
    } else {
      console.error(`❌ Still have ${stillNull} NULL positions after migration`)
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

verifyPositionField()
