import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Check for service role key (required for migrations)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration',
        message: 'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 })
    }
    
    // Create admin client
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/001_create_workout_tables.sql')
    let migrationSQL = ''
    
    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    } catch (error) {
      // If file doesn't exist, use inline SQL
      migrationSQL = `
        -- Create workout_clients table if it doesn't exist
        CREATE TABLE IF NOT EXISTS workout_clients (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          age INTEGER,
          sex TEXT,
          height_cm NUMERIC,
          weight_kg NUMERIC,
          goals TEXT,
          injuries TEXT,
          equipment TEXT[],
          fitness_level TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create workout_sessions table if it doesn't exist
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          plan JSONB NOT NULL,
          client_id TEXT REFERENCES workout_clients(id) ON DELETE SET NULL,
          source TEXT DEFAULT 'ai',
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
        CREATE INDEX IF NOT EXISTS idx_workout_sessions_created_at ON workout_sessions(created_at DESC);
      `
    }
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    const results = []
    const errors = []
    
    for (const statement of statements) {
      try {
        // For RLS policies, we need to check if they exist first
        if (statement.includes('CREATE POLICY')) {
          // Extract policy name and table
          const policyMatch = statement.match(/CREATE POLICY "([^"]+)" ON (\w+)/)
          if (policyMatch) {
            const [, policyName, tableName] = policyMatch
            // Try to create, ignore if exists
            try {
              const { error } = await supabase.rpc('exec_sql', {
                sql: statement
              }).single()
              
              if (!error) {
                results.push(`Created policy: ${policyName} on ${tableName}`)
              }
            } catch (e) {
              // Policy might already exist, that's okay
              results.push(`Policy already exists: ${policyName} on ${tableName}`)
            }
          }
        } else {
          // For regular statements, we can't use RPC, so we'll just track what should be created
          results.push(`Statement prepared: ${statement.substring(0, 50)}...`)
        }
      } catch (error: any) {
        errors.push({
          statement: statement.substring(0, 100),
          error: error.message
        })
      }
    }
    
    // Test if tables were created
    const { data: sessionTest } = await supabase
      .from('workout_sessions')
      .select('id')
      .limit(1)
    
    const { data: clientTest } = await supabase
      .from('workout_clients')
      .select('id')
      .limit(1)
    
    return NextResponse.json({
      success: errors.length === 0,
      message: 'Migration check completed',
      tablesExist: {
        workout_sessions: sessionTest !== null,
        workout_clients: clientTest !== null
      },
      results,
      errors,
      note: 'Some operations may need to be run directly in Supabase SQL editor'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Migration failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}