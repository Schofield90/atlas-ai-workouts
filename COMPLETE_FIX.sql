-- COMPLETE FIX FOR WORKOUT_SESSIONS TABLE
-- Run ALL of this in Supabase SQL Editor

-- 1. Drop the existing table and recreate it properly
DROP TABLE IF EXISTS workout_sessions CASCADE;

-- 2. Create the table with correct column types
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  client_id TEXT REFERENCES workout_clients(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'ai',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Create indexes
CREATE INDEX idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX idx_workout_sessions_created_at ON workout_sessions(created_at DESC);

-- 4. Enable RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
CREATE POLICY "workout_sessions_select" ON workout_sessions FOR SELECT USING (true);
CREATE POLICY "workout_sessions_insert" ON workout_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_sessions_update" ON workout_sessions FOR UPDATE USING (true);
CREATE POLICY "workout_sessions_delete" ON workout_sessions FOR DELETE USING (true);

-- 6. Grant permissions
GRANT ALL ON workout_sessions TO anon, authenticated;

-- 7. Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workout_sessions'
ORDER BY ordinal_position;