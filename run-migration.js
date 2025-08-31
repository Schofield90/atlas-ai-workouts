// Quick migration runner for Atlas AI Workouts
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

console.log('🚀 Atlas AI Workouts - Database Migration Runner')
console.log('================================================')
console.log('')

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    // Test connection first
    console.log('Testing database connection...')
    const { data: test, error: testError } = await supabase
      .from('workout_sessions')
      .select('count')
      .limit(1)
    
    if (testError && !testError.message.includes('does not exist')) {
      console.error('❌ Failed to connect to database:', testError.message)
      return
    }
    
    console.log('✅ Connected to database')
    console.log('')
    
    // Check which tables exist
    console.log('Checking existing tables...')
    const tables = ['workout_sessions', 'workout_clients', 'workout_sops', 'workout_feedback', 'workout_contexts']
    const tableStatus = {}
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      tableStatus[table] = !error || !error.message.includes('does not exist')
      console.log(`  ${tableStatus[table] ? '✅' : '❌'} ${table}`)
    }
    
    console.log('')
    
    // Count existing data
    if (tableStatus.workout_sessions) {
      const { count: sessionCount } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
      console.log(`📊 Existing workouts: ${sessionCount || 0}`)
    }
    
    if (tableStatus.workout_clients) {
      const { count: clientCount } = await supabase
        .from('workout_clients')
        .select('*', { count: 'exact', head: true })
      console.log(`📊 Existing clients: ${clientCount || 0}`)
    }
    
    if (tableStatus.workout_sops) {
      const { count: sopCount } = await supabase
        .from('workout_sops')
        .select('*', { count: 'exact', head: true })
      console.log(`📊 Existing SOPs: ${sopCount || 0}`)
    }
    
    console.log('')
    console.log('================================================')
    console.log('✅ Database check complete!')
    console.log('')
    
    // Check if we need to create tables
    const needsTables = Object.values(tableStatus).some(exists => !exists)
    
    if (needsTables) {
      console.log('⚠️  Some tables are missing.')
      console.log('')
      console.log('To create them, please:')
      console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql')
      console.log('2. Copy the SQL from: supabase/migrations/20250831_complete_setup.sql')
      console.log('3. Paste and run in the SQL editor')
    } else {
      console.log('✅ All tables exist! Your database is ready.')
      console.log('')
      console.log('You can now:')
      console.log('- Create workouts at: https://atlas-ai-workouts.vercel.app/builder')
      console.log('- View workouts at: https://atlas-ai-workouts.vercel.app/workouts')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

runMigration()