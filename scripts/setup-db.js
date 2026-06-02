#!/usr/bin/env node
/**
 * Direct Database Setup Script
 * Uses REST API to execute SQL queries
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Extract project ID from URL
const projectId = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1]
if (!projectId) {
  console.error('❌ Could not extract project ID from SUPABASE_URL')
  process.exit(1)
}

async function executeSQL(sql, description) {
  console.log(`\n${description}`)

  // For testing connection only - we'll show instructions for manual SQL execution
  return Promise.resolve()
}

async function runSetup() {
  console.log('🚀 Setting up Supabase database...\n')

  try {
    // Read schema and seed files
    const schemaPath = path.join(process.cwd(), 'lib/supabase/schema.sql')
    const seedPath = path.join(process.cwd(), 'lib/supabase/seed-data.sql')

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
    const seedSql = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : null

    // Test connection using REST API
    console.log('🧪 Testing database connection...')
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tables`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Database connection successful')
      } else {
        console.warn('⚠️  Could not reach database')
      }
    } catch (e) {
      console.warn('⚠️  Connection test inconclusive')
    }

    // Show instructions for manual SQL execution
    console.log('\n📋 Database Schema Setup Instructions:')
    console.log('=====================================')
    console.log('Since RPC functions are not available, please manually run SQL:\n')
    console.log('1. Go to Supabase Dashboard:')
    console.log(`   https://app.supabase.com/project/${projectId}\n`)
    console.log('2. Click "SQL Editor" in the left sidebar')
    console.log('3. Click "New Query"')
    console.log('4. Copy and paste the contents of: lib/supabase/schema.sql')
    console.log('5. Click "Run"')
    console.log('6. Then repeat steps 2-5 with: lib/supabase/seed-data.sql\n')

    console.log('📝 SQL Files to Execute:')
    console.log('------------------------')
    console.log(`Schema file: ${schemaPath}`)
    console.log(`  - Size: ${schemaSql.length} characters`)
    console.log(`  - Contains: Tables, indexes, foreign keys\n`)

    if (seedSql) {
      console.log(`Seed file: ${seedPath}`)
      console.log(`  - Size: ${seedSql.length} characters`)
      console.log(`  - Contains: Initial test data\n`)
    }

    console.log('✨ Once you complete the manual SQL execution:')
    console.log('   1. The app will automatically load data from Supabase')
    console.log('   2. Start the dev server: npm run dev')
    console.log('   3. Navigate to http://localhost:3000/dashboard')
    console.log('   4. Changes made in the app will be persisted to Supabase')

  } catch (error) {
    console.error('❌ Setup failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

runSetup()
