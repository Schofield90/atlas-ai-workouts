-- FIX: Change ID column from UUID to TEXT
-- Run this in Supabase SQL Editor

-- First, drop any foreign key constraints
ALTER TABLE workout_feedback DROP CONSTRAINT IF EXISTS workout_feedback_workout_id_fkey;

-- Change the ID column type to TEXT
ALTER TABLE workout_sessions ALTER COLUMN id TYPE TEXT;

-- Re-add the foreign key constraint
ALTER TABLE workout_feedback 
ADD CONSTRAINT workout_feedback_workout_id_fkey 
FOREIGN KEY (workout_id) REFERENCES workout_sessions(id) ON DELETE CASCADE;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_sessions' 
AND column_name = 'id';