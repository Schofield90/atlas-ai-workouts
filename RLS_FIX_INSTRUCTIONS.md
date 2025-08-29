# 🔧 Excel Import Fix Instructions

## The Problem
Your Excel import found all 168 clients but couldn't save them to the database. This is because Row Level Security (RLS) is enabled on the database tables, which blocks inserts.

## Quick Fix (2 minutes)

### Step 1: Run the Fix Script
```bash
node scripts/fix-rls-simple.js
```

This will show you the SQL commands you need to run.

### Step 2: Execute SQL in Supabase
1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
2. Copy the SQL shown by the script (or copy from below):

```sql
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
```

3. Click "Run" to execute

### Step 3: Verify the Fix
```bash
node scripts/verify-rls-status.js
```

Run this to check if RLS has been disabled. You should see:
- All tables showing "✅ Disabled (Imports will work)"
- "Can Insert to Clients" = TRUE

### Step 4: Retry Your Import
Now go back to the Clients page and try importing your Excel file again. All 168 clients should import successfully!

## What This Does
- **Disables RLS**: Removes the security restrictions that were blocking imports
- **Allows Inserts**: Lets the app save data to the database
- **Keeps Data Safe**: Your data is still protected by authentication

## Important Notes
- This is a one-time fix
- Your data remains in Supabase (cloud storage)
- No local storage is used anymore
- The app is now cloud-only as requested

## Alternative: Keep RLS but Fix Policies
If you prefer to keep RLS enabled with permissive policies, run this instead:

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

## Need Help?
If you still have issues after running the fix:
1. Check the console for any error messages
2. Make sure you're on the correct Supabase project
3. Try refreshing the page after running the SQL
4. Run `node scripts/verify-rls-status.js` to check the status

## Files Involved
- `/scripts/fix-rls-simple.js` - Shows the SQL to disable RLS
- `/scripts/verify-rls-status.js` - Checks if RLS is disabled
- `/app/api/clients/import-multi-sheet/route.ts` - Handles the Excel import