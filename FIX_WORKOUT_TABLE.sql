-- URGENT FIX: Add missing plan column to workout_sessions table
-- Run this in Supabase SQL Editor NOW!

-- Add the plan column if it doesn't exist
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS plan JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_sessions' 
AND column_name = 'plan';