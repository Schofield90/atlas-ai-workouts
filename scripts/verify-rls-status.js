#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyRLSStatus() {
  console.log('🔍 Checking RLS Status for Workout Tables\n');
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  console.log('━'.repeat(80));
  console.log('RUN THIS SQL IN SUPABASE TO CHECK RLS STATUS:\n');
  
  const checkSQL = `
-- Check RLS status for all workout tables
SELECT 
    tablename AS "Table",
    CASE 
        WHEN rowsecurity = true THEN '❌ Enabled (Will block imports)'
        ELSE '✅ Disabled (Imports will work)'
    END AS "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename;

-- Check if you can insert into workout_clients
SELECT 
    has_table_privilege('workout_clients', 'INSERT') AS "Can Insert to Clients",
    has_table_privilege('workout_clients', 'SELECT') AS "Can Read Clients";
`;

  console.log(checkSQL);
  console.log('━'.repeat(80));
  console.log('\n📍 Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
  console.log('📋 Copy and run the SQL above\n');
  console.log('Expected Results:');
  console.log('  - All tables should show "✅ Disabled" for imports to work');
  console.log('  - "Can Insert to Clients" should be TRUE');
  console.log('  - "Can Read Clients" should be TRUE\n');
  console.log('If any show "❌ Enabled", run the fix script: node scripts/fix-rls-simple.js');
}

verifyRLSStatus();