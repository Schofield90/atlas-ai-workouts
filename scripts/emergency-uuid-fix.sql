-- EMERGENCY UUID FIX SCRIPT
-- Run this directly in Supabase SQL Editor to fix the client ID issues

-- Step 1: Check for invalid UUIDs
SELECT id, full_name, LENGTH(id) as id_length
FROM workout_clients
WHERE LENGTH(id) != 36
ORDER BY created_at DESC;

-- Step 2: Create backup table for audit trail
CREATE TABLE IF NOT EXISTS workout_clients_id_audit (
  original_id text PRIMARY KEY,
  fixed_id text,
  full_name text,
  fixed_at timestamp with time zone DEFAULT now()
);

-- Step 3: Backup invalid IDs before fixing
INSERT INTO workout_clients_id_audit (original_id, fixed_id, full_name)
SELECT id, SUBSTRING(id, 1, 36), full_name
FROM workout_clients
WHERE LENGTH(id) > 36
ON CONFLICT (original_id) DO NOTHING;

-- Step 4: Fix workout_sessions first (to avoid foreign key issues)
UPDATE workout_sessions
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL 
  AND LENGTH(client_id) > 36;

-- Step 5: Fix workout_feedback
UPDATE workout_feedback
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL 
  AND LENGTH(client_id) > 36;

-- Step 6: Fix the client IDs themselves
UPDATE workout_clients
SET id = SUBSTRING(id, 1, 36)
WHERE LENGTH(id) > 36;

-- Step 7: Verify the fix
SELECT 
  'Clients with invalid IDs' as check_type,
  COUNT(*) as count
FROM workout_clients
WHERE LENGTH(id) != 36

UNION ALL

SELECT 
  'Sessions with invalid client IDs' as check_type,
  COUNT(*) as count
FROM workout_sessions
WHERE client_id IS NOT NULL AND LENGTH(client_id) != 36

UNION ALL

SELECT 
  'Feedback with invalid client IDs' as check_type,
  COUNT(*) as count
FROM workout_feedback
WHERE client_id IS NOT NULL AND LENGTH(client_id) != 36;

-- Step 8: Show fixed IDs for verification
SELECT * FROM workout_clients_id_audit;