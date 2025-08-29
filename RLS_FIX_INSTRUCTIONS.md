# 🔧 Fix Database Permissions for Import

## The Issue
Your Excel import is finding all 168 clients but failing to save them to the database due to Row Level Security (RLS) policies blocking inserts.

## Quick Fix - Apply This Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
2. Copy and paste this SQL:

```sql
-- Fix RLS policies to allow client imports
ALTER TABLE public.workout_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_client_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_users DISABLE ROW LEVEL SECURITY;

-- Note: This disables RLS for development. 
-- Re-enable with proper policies for production.
```

3. Click "Run" to execute

### Option 2: Keep RLS but Fix Policies
If you want to keep RLS enabled but make it work, run this instead:

```sql
-- Drop all existing policies on workout tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'workout_%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Create simple permissive policies for development
CREATE POLICY "Allow all operations" ON public.workout_clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_client_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.workout_users FOR ALL USING (true) WITH CHECK (true);
```

## After Applying the Fix

1. **Test the connection**: 
   - Visit http://localhost:3001/api/test-db
   - You should see `"canInsert": true`

2. **Retry your Excel import**:
   - Go back to http://localhost:3001/clients
   - Try importing your Excel file again
   - All 168 clients should now save successfully

## Why This Happened

Row Level Security (RLS) is a Supabase feature that restricts database access based on user authentication. The initial migration had strict RLS policies that required proper user authentication, but the import process uses a simplified "default-user" approach which was being blocked.

## For Production

Before going to production, you should:
1. Implement proper authentication (Supabase Auth)
2. Re-enable RLS with appropriate policies
3. Ensure each user only sees their own data

## Quick Check

Run this query in Supabase to see if RLS is enabled:

```sql
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'workout_%';
```

If `rowsecurity` is `true`, RLS is enabled. If `false`, it's disabled.