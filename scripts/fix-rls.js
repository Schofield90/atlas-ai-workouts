#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixRLS() {
  console.log('🔧 Fixing RLS policies for workout tables...\n');
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  // Since we don't have service key, let's create a simple web page to run the SQL
  console.log('📝 Since we need admin access to change RLS policies, please run this SQL in Supabase Dashboard:\n');
  
  const sql = `
-- IMPORTANT: This will disable RLS to allow imports to work
-- Run this in the Supabase SQL Editor

-- Step 1: Disable RLS on all workout tables
ALTER TABLE public.workout_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_client_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename;

-- You should see FALSE for all tables after running this
`;

  console.log('━'.repeat(80));
  console.log(sql);
  console.log('━'.repeat(80));
  console.log('\n📍 Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
  console.log('📋 Copy and paste the SQL above');
  console.log('▶️  Click "Run" to execute\n');
  console.log('After running, you should see all tables with "RLS Enabled" = false\n');
  console.log('Then your Excel imports will work! ✅');
}

fixRLS();