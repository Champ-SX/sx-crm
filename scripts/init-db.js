#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_KEY ? '✓' : '✗')
  console.error('\nGet the service role key from: https://app.supabase.com/project/ujgiaqfuywnrimjjcekb/settings/api')
  process.exit(1)
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const projectId = url.hostname.split('.')[0]

    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({ sql }))
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify({ sql }))
    req.end()
  })
}

async function setup() {
  console.log('🚀 Setting up Supabase database...\n')

  try {
    // Read schema
    const schemaPath = path.join(__dirname, '../lib/supabase/schema.sql')
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8')

    console.log('📋 Applying schema...')
    try {
      await executeSQL(schemaSQL)
      console.log('✅ Schema applied successfully\n')
    } catch (err) {
      console.log('⚠️  Could not apply schema via RPC:', err.message)
      console.log('\n📖 Manual Setup Instructions:')
      console.log('='*60)
      console.log('1. Go to: https://app.supabase.com/project/ujgiaqfuywnrimjjcekb/sql/new')
      console.log('2. Copy and paste the contents of: lib/supabase/schema.sql')
      console.log('3. Click "Run"')
      console.log('4. Repeat steps 1-3 with: lib/supabase/seed-data.sql')
      console.log('='*60 + '\n')
    }

    // Try seed data
    const seedPath = path.join(__dirname, '../lib/supabase/seed-data.sql')
    if (fs.existsSync(seedPath)) {
      const seedSQL = fs.readFileSync(seedPath, 'utf-8')
      console.log('🌱 Applying seed data...')
      try {
        await executeSQL(seedSQL)
        console.log('✅ Seed data applied successfully\n')
      } catch (err) {
        console.log('⚠️  Could not apply seed data:', err.message)
      }
    }

    console.log('✨ Database setup ready!')
    console.log('   Run: npm run dev')
    console.log('   Then visit: http://localhost:3000/won-ready-op')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

setup()
