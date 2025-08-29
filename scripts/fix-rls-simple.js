#!/usr/bin/env node

console.log('🔧 RLS Fix Instructions for Excel Import\n');
console.log('━'.repeat(80));
console.log(`
COPY THIS SQL AND RUN IN SUPABASE:

-- Disable RLS to allow Excel imports to work
ALTER TABLE public.workout_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_client_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename;
`);
console.log('━'.repeat(80));
console.log('\n📍 Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
console.log('📋 Copy the SQL above');
console.log('▶️  Click "Run" to execute\n');
console.log('✅ After this, your Excel imports will work!');