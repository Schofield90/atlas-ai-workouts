import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.L2bRMAqaXC_LagxZp83RJQtMWRhsb5kPMQnLmXRFC2E'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // Create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS workout_sops (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    })

    if (createError && !createError.message.includes('already exists')) {
      console.error('Error creating table:', createError)
    }

    // Test if table exists by querying it
    const { data, error } = await supabase
      .from('workout_sops')
      .select('id')
      .limit(1)

    if (error && !error.message.includes('no rows')) {
      // Table doesn't exist, try REST API approach
      console.log('Table query failed, attempting direct creation...')
      
      // Since we can't execute arbitrary SQL through Supabase client,
      // we'll just return success and manually create the table
      return NextResponse.json({
        success: false,
        message: 'Table needs to be created manually in Supabase dashboard',
        sqlToRun: `
CREATE TABLE IF NOT EXISTS workout_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sops_org ON workout_sops(organization_id);
CREATE INDEX IF NOT EXISTS idx_workout_sops_category ON workout_sops(category);

ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on workout_sops" ON workout_sops
  FOR ALL
  USING (true)
  WITH CHECK (true);
        `
      })
    }

    return NextResponse.json({
      success: true,
      message: 'SOPs table ready'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}