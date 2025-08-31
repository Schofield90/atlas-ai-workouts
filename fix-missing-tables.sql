-- Fix Missing Tables for Atlas AI Workouts
-- Run this in Supabase SQL Editor

-- Create Feedback Table
CREATE TABLE IF NOT EXISTS workout_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workout_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create Contexts Table
CREATE TABLE IF NOT EXISTS workout_contexts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  text_sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_feedback_workout_id ON workout_feedback(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_contexts_created_at ON workout_contexts(created_at DESC);

-- Enable RLS
ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_contexts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "workout_feedback_select" ON workout_feedback FOR SELECT USING (true);
CREATE POLICY "workout_feedback_insert" ON workout_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_feedback_update" ON workout_feedback FOR UPDATE USING (true);
CREATE POLICY "workout_feedback_delete" ON workout_feedback FOR DELETE USING (true);

CREATE POLICY "workout_contexts_select" ON workout_contexts FOR SELECT USING (true);
CREATE POLICY "workout_contexts_insert" ON workout_contexts FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_contexts_update" ON workout_contexts FOR UPDATE USING (true);
CREATE POLICY "workout_contexts_delete" ON workout_contexts FOR DELETE USING (true);

-- Create trigger for contexts updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workout_contexts_updated_at
  BEFORE UPDATE ON workout_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON workout_feedback TO anon, authenticated;
GRANT ALL ON workout_contexts TO anon, authenticated;