-- Create workout_sops table for storing SOPs and context
CREATE TABLE IF NOT EXISTS workout_sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_workout_sops_org ON workout_sops(organization_id);
CREATE INDEX idx_workout_sops_category ON workout_sops(category);

-- Enable RLS
ALTER TABLE workout_sops ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow all operations (for now, since auth is disabled)
CREATE POLICY "Allow all operations on workout_sops" ON workout_sops
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workout_sops_updated_at BEFORE UPDATE
  ON workout_sops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();