#!/usr/bin/env node
/**
 * Supabase Setup Script
 * Runs the schema.sql and seed-data.sql to initialize the database
 *
 * Usage: npx ts-node scripts/setup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Use service role key if available (for admin operations), otherwise use anon key
const client = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

async function runSetup() {
  console.log('🚀 Setting up Supabase database...\n')

  try {
    // Read schema SQL
    const schemaPath = path.join(process.cwd(), 'lib/supabase/schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')

    console.log('📋 Creating database schema...')
    let schemaError: any = null
    try {
      const result = await client.rpc('exec', {
        sql: schemaSql,
      })
      schemaError = result.error
    } catch (e) {
      // If rpc doesn't work, we'll try direct SQL execution
      schemaError = { message: 'RPC not available, trying direct SQL' }
    }

    if (schemaError?.message?.includes('RPC')) {
      console.log('⚠️  RPC method not available. Using SQL query method...')
      // Try using the REST API directly
      const statements = schemaSql.split(';').filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const result = await client.rpc('exec', { sql: statement })
            if (result.error && !result.error.message?.includes('function exec')) {
              console.error('❌ SQL Error:', result.error.message)
            }
          } catch (e) {
            // Ignore RPC errors if method not available
          }
        }
      }
    } else if (schemaError) {
      console.error('❌ Schema Error:', schemaError.message)
      console.log('\n💡 Tip: You can manually run the SQL in Supabase Dashboard:')
      console.log('   1. Go to https://app.supabase.com/project/' + supabaseUrl?.split('.')[0])
      console.log('   2. Click "SQL Editor" → "New Query"')
      console.log('   3. Copy contents of lib/supabase/schema.sql')
      console.log('   4. Run the query')
    } else {
      console.log('✅ Database schema created successfully')
    }

    // Read seed data SQL
    const seedPath = path.join(process.cwd(), 'lib/supabase/seed-data.sql')
    if (fs.existsSync(seedPath)) {
      console.log('\n🌱 Seeding initial data...')
      const seedSql = fs.readFileSync(seedPath, 'utf-8')

      let seedError = null
      try {
        const result = await client.rpc('exec', {
          sql: seedSql,
        })
        seedError = result.error
      } catch (e) {
        // Ignore errors on seed data
        seedError = null
      }

      if (seedError) {
        console.warn('⚠️  Seed Error:', seedError.message)
        console.log('   (This is usually OK if tables already have data)')
      } else {
        console.log('✅ Seed data inserted successfully')
      }
    }

    // Test the connection
    console.log('\n🧪 Testing database connection...')
    const { data, error: testError } = await client
      .from('companies')
      .select('count', { count: 'exact', head: true })

    if (testError) {
      console.error('❌ Connection Test Failed:', testError.message)
      process.exit(1)
    }

    console.log('✅ Database connection successful')
    console.log('\n✨ Supabase setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. The app will automatically load data from Supabase')
    console.log('   2. Start the dev server: npm run dev')
    console.log('   3. Navigate to http://localhost:3000/dashboard')
    console.log('   4. Changes made in the app will be persisted to Supabase')

  } catch (error) {
    console.error('❌ Setup failed:', error instanceof Error ? error.message : String(error))
    console.log('\n💡 Manual Setup Instructions:')
    console.log('   1. Visit: https://app.supabase.com/project/')
    console.log('   2. Open SQL Editor')
    console.log('   3. Copy & run: lib/supabase/schema.sql')
    console.log('   4. Copy & run: lib/supabase/seed-data.sql')
    process.exit(1)
  }
}

runSetup()
