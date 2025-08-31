import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    
    // SQL to create the table
    const sql = `
      -- Create workout_sops table for storing SOPs and context
      CREATE TABLE IF NOT EXISTS workout_sops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_workout_sops_org ON workout_sops(organization_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sops_category ON workout_sops(category);

      -- Enable RLS
      ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies to allow all operations (for now, since auth is disabled)
      DROP POLICY IF EXISTS "Allow all operations on workout_sops" ON workout_sops;
      CREATE POLICY "Allow all operations on workout_sops" ON workout_sops
        FOR ALL
        USING (true)
        WITH CHECK (true);

      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_workout_sops_updated_at ON workout_sops;
      CREATE TRIGGER update_workout_sops_updated_at BEFORE UPDATE
        ON workout_sops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
    
    // Execute the SQL using Supabase's RPC
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      }
    )
    
    if (!response.ok) {
      // If RPC doesn't work, try a different approach
      // First, check if table exists
      const checkResponse = await fetch(
        `${supabaseUrl}/rest/v1/workout_sops?select=id&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (checkResponse.status === 404) {
        // Table doesn't exist, we need to create it manually
        return NextResponse.json({
          error: 'Table does not exist. Please create it manually in Supabase dashboard',
          sql: sql,
          instructions: [
            '1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new',
            '2. Copy the SQL provided in the "sql" field',
            '3. Paste it in the SQL editor',
            '4. Click "Run" to create the table',
            '5. Then refresh this page and click "Migrate Local SOPs to Database"'
          ]
        }, { status: 400 })
      } else if (checkResponse.ok) {
        // Table already exists
        return NextResponse.json({
          success: true,
          message: 'Table already exists!'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Table created successfully!'
    })
  } catch (error) {
    console.error('Error creating table:', error)
    
    // Return the SQL so user can run it manually
    const sql = `
-- Create workout_sops table for storing SOPs and context
CREATE TABLE IF NOT EXISTS workout_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_sops_org ON workout_sops(organization_id);
CREATE INDEX IF NOT EXISTS idx_workout_sops_category ON workout_sops(category);

-- Enable RLS
ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on workout_sops" ON workout_sops
  FOR ALL
  USING (true)
  WITH CHECK (true);`
    
    return NextResponse.json({
      error: 'Could not create table automatically',
      sql: sql,
      instructions: [
        '1. Go to https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new',
        '2. Copy the SQL provided above',
        '3. Paste it in the SQL editor',
        '4. Click "Run" to create the table',
        '5. Then refresh this page and click "Migrate Local SOPs to Database"'
      ],
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}