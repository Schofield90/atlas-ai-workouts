-- Safe RLS Fix Script
-- This script checks which tables exist before trying to disable RLS

-- First, check which workout tables exist
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename;

-- Disable RLS only on tables that exist
DO $$ 
BEGIN
    -- Check and disable for each table if it exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_clients') THEN
        ALTER TABLE public.workout_clients DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_clients';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_sessions') THEN
        ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_sessions';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_feedback') THEN
        ALTER TABLE public.workout_feedback DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_feedback';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_exercises') THEN
        ALTER TABLE public.workout_exercises DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_exercises';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_client_messages') THEN
        ALTER TABLE public.workout_client_messages DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_client_messages';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_organizations') THEN
        ALTER TABLE public.workout_organizations DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_organizations';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_users') THEN
        ALTER TABLE public.workout_users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on workout_users';
    END IF;
END $$;

-- Verify RLS is now disabled on existing tables
SELECT 
    tablename AS "Table",
    CASE 
        WHEN rowsecurity = true THEN '❌ RLS Enabled'
        ELSE '✅ RLS Disabled'
    END AS "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%'
ORDER BY tablename;