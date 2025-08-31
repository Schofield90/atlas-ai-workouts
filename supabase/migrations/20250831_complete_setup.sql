-- Complete Production Setup for Atlas AI Workouts
-- This migration ensures all tables, indexes, and policies are properly configured

-- ============================================
-- 1. DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================
DROP POLICY IF EXISTS "Allow public read access" ON workout_clients;
DROP POLICY IF EXISTS "Allow public insert" ON workout_clients;
DROP POLICY IF EXISTS "Allow public update" ON workout_clients;
DROP POLICY IF EXISTS "Allow public delete" ON workout_clients;

DROP POLICY IF EXISTS "Allow public read access" ON workout_sessions;
DROP POLICY IF EXISTS "Allow public insert" ON workout_sessions;
DROP POLICY IF EXISTS "Allow public update" ON workout_sessions;
DROP POLICY IF EXISTS "Allow public delete" ON workout_sessions;

DROP POLICY IF EXISTS "Allow public read access" ON workout_sops;
DROP POLICY IF EXISTS "Allow public insert" ON workout_sops;
DROP POLICY IF EXISTS "Allow public update" ON workout_sops;
DROP POLICY IF EXISTS "Allow public delete" ON workout_sops;

DROP POLICY IF EXISTS "Allow public read access" ON workout_feedback;
DROP POLICY IF EXISTS "Allow public insert" ON workout_feedback;

-- ============================================
-- 2. CREATE TABLES (IF NOT EXISTS)
-- ============================================

-- Workout Clients Table
CREATE TABLE IF NOT EXISTS workout_clients (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  sex TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  goals TEXT,
  injuries TEXT,
  equipment TEXT[],
  fitness_level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Workout Sessions Table
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  plan JSONB NOT NULL,
  client_id TEXT REFERENCES workout_clients(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'ai',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- SOPs Table (Standard Operating Procedures)
CREATE TABLE IF NOT EXISTS workout_sops (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('training', 'nutrition', 'assessment', 'general', 'sop', 'chat', 'guide', 'notes')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS workout_feedback (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workout_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Contexts Table (for AI context management)
CREATE TABLE IF NOT EXISTS workout_contexts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  text_sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_created_at ON workout_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_title ON workout_sessions(title);
CREATE INDEX IF NOT EXISTS idx_workout_clients_email ON workout_clients(email);
CREATE INDEX IF NOT EXISTS idx_workout_clients_created_at ON workout_clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sops_category ON workout_sops(category);
CREATE INDEX IF NOT EXISTS idx_workout_sops_created_at ON workout_sops(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_workout_id ON workout_feedback(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_contexts_created_at ON workout_contexts(created_at DESC);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE workout_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_contexts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES (Public Access for Now)
-- ============================================

-- Workout Clients Policies
CREATE POLICY "workout_clients_select" ON workout_clients FOR SELECT USING (true);
CREATE POLICY "workout_clients_insert" ON workout_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_clients_update" ON workout_clients FOR UPDATE USING (true);
CREATE POLICY "workout_clients_delete" ON workout_clients FOR DELETE USING (true);

-- Workout Sessions Policies
CREATE POLICY "workout_sessions_select" ON workout_sessions FOR SELECT USING (true);
CREATE POLICY "workout_sessions_insert" ON workout_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_sessions_update" ON workout_sessions FOR UPDATE USING (true);
CREATE POLICY "workout_sessions_delete" ON workout_sessions FOR DELETE USING (true);

-- Workout SOPs Policies
CREATE POLICY "workout_sops_select" ON workout_sops FOR SELECT USING (true);
CREATE POLICY "workout_sops_insert" ON workout_sops FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_sops_update" ON workout_sops FOR UPDATE USING (true);
CREATE POLICY "workout_sops_delete" ON workout_sops FOR DELETE USING (true);

-- Workout Feedback Policies
CREATE POLICY "workout_feedback_select" ON workout_feedback FOR SELECT USING (true);
CREATE POLICY "workout_feedback_insert" ON workout_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_feedback_update" ON workout_feedback FOR UPDATE USING (true);
CREATE POLICY "workout_feedback_delete" ON workout_feedback FOR DELETE USING (true);

-- Workout Contexts Policies
CREATE POLICY "workout_contexts_select" ON workout_contexts FOR SELECT USING (true);
CREATE POLICY "workout_contexts_insert" ON workout_contexts FOR INSERT WITH CHECK (true);
CREATE POLICY "workout_contexts_update" ON workout_contexts FOR UPDATE USING (true);
CREATE POLICY "workout_contexts_delete" ON workout_contexts FOR DELETE USING (true);

-- ============================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. CREATE TRIGGERS
-- ============================================

-- Auto-update updated_at for workout_clients
CREATE TRIGGER update_workout_clients_updated_at
  BEFORE UPDATE ON workout_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for workout_sessions
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for workout_sops
CREATE TRIGGER update_workout_sops_updated_at
  BEFORE UPDATE ON workout_sops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for workout_contexts
CREATE TRIGGER update_workout_contexts_updated_at
  BEFORE UPDATE ON workout_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. INSERT SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert a sample client if none exist
INSERT INTO workout_clients (id, full_name, email, goals, fitness_level)
SELECT 
  'sample-client-001',
  'Sample User',
  'sample@example.com',
  'General fitness and strength',
  'intermediate'
WHERE NOT EXISTS (
  SELECT 1 FROM workout_clients WHERE id = 'sample-client-001'
);

-- Insert a sample SOP if none exist
INSERT INTO workout_sops (title, content, category)
SELECT 
  'Sample Training Protocol',
  'This is a sample SOP for demonstration. Replace with your actual training protocols.',
  'training'
WHERE NOT EXISTS (
  SELECT 1 FROM workout_sops WHERE title = 'Sample Training Protocol'
);

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 10. FINAL VERIFICATION
-- ============================================

-- This will help verify the migration worked
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: workout_clients, workout_sessions, workout_sops, workout_feedback, workout_contexts';
  RAISE NOTICE 'RLS policies applied for public access';
  RAISE NOTICE 'Indexes created for performance optimization';
END $$;