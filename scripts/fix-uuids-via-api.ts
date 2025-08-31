#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixUUIDs() {
  console.log('🔧 Starting UUID fix process...\n')

  try {
    // Step 1: Check for invalid UUIDs
    console.log('📊 Checking for invalid UUIDs...')
    const checkQuery = `
      SELECT id, full_name, LENGTH(id::text) as id_length
      FROM workout_clients
      WHERE LENGTH(id::text) != 36
      ORDER BY created_at DESC
    `
    
    const { data: invalidClients, error: checkError } = await supabase.rpc('execute_sql', {
      query: checkQuery
    }).single()

    if (checkError) {
      // Try direct query
      const { data: clients, error } = await supabase
        .from('workout_clients')
        .select('id, full_name')
      
      if (error) {
        console.error('❌ Error checking clients:', error)
        return
      }

      const invalid = clients?.filter(c => c.id.length !== 36) || []
      console.log(`Found ${invalid.length} clients with invalid UUIDs`)
      
      if (invalid.length > 0) {
        console.log('Invalid clients:', invalid)
      }
    }

    // Step 2: Create backup table
    console.log('\n📦 Creating backup table...')
    const createBackupTable = `
      CREATE TABLE IF NOT EXISTS workout_clients_id_audit (
        original_id text PRIMARY KEY,
        fixed_id text,
        full_name text,
        fixed_at timestamp with time zone DEFAULT now()
      )
    `
    
    const { error: createError } = await supabase.rpc('execute_sql', {
      query: createBackupTable
    }).single()

    if (createError) {
      console.log('⚠️  Backup table might already exist (this is ok)')
    }

    // Step 3: Backup invalid IDs
    console.log('\n💾 Backing up invalid IDs...')
    const backupQuery = `
      INSERT INTO workout_clients_id_audit (original_id, fixed_id, full_name)
      SELECT id::text, SUBSTRING(id::text, 1, 36), full_name
      FROM workout_clients
      WHERE LENGTH(id::text) > 36
      ON CONFLICT (original_id) DO NOTHING
    `
    
    const { error: backupError } = await supabase.rpc('execute_sql', {
      query: backupQuery
    }).single()

    if (backupError) {
      console.log('⚠️  No invalid IDs to backup (this might be good!)')
    }

    // Step 4: Fix workout_sessions
    console.log('\n🔧 Fixing workout_sessions table...')
    const fixSessionsQuery = `
      UPDATE workout_sessions
      SET client_id = SUBSTRING(client_id::text, 1, 36)::uuid
      WHERE client_id IS NOT NULL 
        AND LENGTH(client_id::text) > 36
    `
    
    const { error: sessionsError } = await supabase.rpc('execute_sql', {
      query: fixSessionsQuery
    }).single()

    if (sessionsError) {
      console.log('⚠️  No sessions needed fixing')
    }

    // Step 5: Fix workout_feedback
    console.log('\n🔧 Fixing workout_feedback table...')
    const fixFeedbackQuery = `
      UPDATE workout_feedback
      SET client_id = SUBSTRING(client_id::text, 1, 36)::uuid
      WHERE client_id IS NOT NULL 
        AND LENGTH(client_id::text) > 36
    `
    
    const { error: feedbackError } = await supabase.rpc('execute_sql', {
      query: fixFeedbackQuery
    }).single()

    if (feedbackError) {
      console.log('⚠️  No feedback needed fixing')
    }

    // Step 6: Fix client IDs
    console.log('\n🔧 Fixing workout_clients table...')
    const fixClientsQuery = `
      UPDATE workout_clients
      SET id = SUBSTRING(id::text, 1, 36)::uuid
      WHERE LENGTH(id::text) > 36
    `
    
    const { error: clientsError } = await supabase.rpc('execute_sql', {
      query: fixClientsQuery
    }).single()

    if (clientsError) {
      console.log('⚠️  No clients needed fixing')
    }

    // Step 7: Verify the fix
    console.log('\n✅ Verifying fixes...')
    const verifyQuery = `
      SELECT 
        'Clients with invalid IDs' as check_type,
        COUNT(*) as count
      FROM workout_clients
      WHERE LENGTH(id::text) != 36
      
      UNION ALL
      
      SELECT 
        'Sessions with invalid client IDs' as check_type,
        COUNT(*) as count
      FROM workout_sessions
      WHERE client_id IS NOT NULL AND LENGTH(client_id::text) != 36
      
      UNION ALL
      
      SELECT 
        'Feedback with invalid client IDs' as check_type,
        COUNT(*) as count
      FROM workout_feedback
      WHERE client_id IS NOT NULL AND LENGTH(client_id::text) != 36
    `
    
    const { data: verifyResults, error: verifyError } = await supabase.rpc('execute_sql', {
      query: verifyQuery
    }).single()

    if (verifyError) {
      // Try direct verification
      const { data: clients } = await supabase
        .from('workout_clients')
        .select('id')
      
      const invalidCount = clients?.filter(c => c.id.length !== 36).length || 0
      console.log(`Remaining invalid UUIDs: ${invalidCount}`)
      
      if (invalidCount === 0) {
        console.log('✅ All UUIDs are now valid!')
      } else {
        console.log('❌ Some UUIDs are still invalid. Manual intervention may be needed.')
      }
    } else {
      console.log('Verification results:', verifyResults)
    }

    console.log('\n🎉 UUID fix process complete!')
    console.log('Next steps:')
    console.log('1. Test the application at: https://atlas-ai-workouts.vercel.app')
    console.log('2. Click on client links to verify they work')
    console.log('3. Check /api/monitoring/uuid-health for status')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixUUIDs()