-- Create workout_clients table if it doesn't exist
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

-- Create workout_sessions table if it doesn't exist
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_created_at ON workout_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_clients_email ON workout_clients(email);

-- Create SOPs table for storing standard operating procedures
CREATE TABLE IF NOT EXISTS workout_sops (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS workout_feedback (
  id TEXT PRIMARY KEY,
  workout_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security (RLS)
ALTER TABLE workout_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for now - you can restrict later)
CREATE POLICY "Allow public read access" ON workout_clients FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON workout_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON workout_clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON workout_clients FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON workout_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON workout_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON workout_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON workout_sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON workout_sops FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON workout_sops FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON workout_sops FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON workout_sops FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON workout_feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON workout_feedback FOR INSERT WITH CHECK (true);