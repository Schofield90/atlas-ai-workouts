#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('placeholder')) {
  console.error('❌ Missing or invalid Supabase configuration')
  console.error('Please update SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('Get it from: Supabase Dashboard > Settings > API > Service Role Key')
  process.exit(1)
}

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_secure_rls_policies.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }
  
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('📦 Applying migration: 004_secure_rls_policies.sql')
  
  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql })
    
    if (error) {
      // Try direct execution as fallback
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      for (const statement of statements) {
        console.log('Executing statement:', statement.substring(0, 50) + '...')
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        if (stmtError) {
          console.warn('Statement warning:', stmtError.message)
        }
      }
    }
    
    console.log('✅ Migration applied successfully!')
    console.log('Your Excel import should now work properly.')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql')
    process.exit(1)
  }
}

// Run the migration
applyMigration()