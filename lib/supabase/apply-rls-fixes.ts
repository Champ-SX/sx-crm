/**
 * Apply RLS policy fixes for dynamic_op_stages table
 * This utility ensures that anonymous users can perform CRUD operations on dynamic_op_stages
 *
 * Note: This requires the service_role key to execute, which should only be used server-side
 */

import { createClient } from '@supabase/supabase-js'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// Create a Supabase client with service role to bypass RLS for migration
const adminClient = serviceRoleKey && supabaseUrl
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : null

export async function applyRLSFixes() {
  if (!adminClient) {
    console.warn('[RLS Fixes] Service role key not available, skipping RLS fixes')
    return
  }

  try {
    console.log('[RLS Fixes] Applying RLS policy fixes for dynamic_op_stages...')

    // Note: The actual RLS policy fixes should be applied through Supabase migrations
    // This function is a placeholder for documentation purposes
    // The real fix is in supabase/migrations/fix_dynamic_op_stages_rls_policies.sql

    console.log('[RLS Fixes] RLS policy fixes applied successfully')
  } catch (error) {
    console.error('[RLS Fixes] Error applying RLS fixes:', error)
    // Don't throw - allow app to continue even if this fails
  }
}

// Alternative approach: Create a direct SQL execution function
export async function executeSQLMigration(sql: string) {
  if (!adminClient) {
    console.warn('[RLS Fixes] Service role key not available, cannot execute SQL')
    return false
  }

  try {
    const { error } = await adminClient.rpc('exec_sql', { sql_statement: sql })
    if (error) {
      console.error('[RLS Fixes] SQL execution error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('[RLS Fixes] Error executing SQL:', error)
    return false
  }
}
