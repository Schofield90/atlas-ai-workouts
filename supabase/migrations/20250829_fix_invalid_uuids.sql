-- Fix invalid UUIDs in workout_clients table
-- First, identify any clients with invalid ID lengths

-- Create a backup of invalid IDs before fixing
CREATE TABLE IF NOT EXISTS workout_clients_id_backup (
  id text PRIMARY KEY,
  original_id text,
  fixed_at timestamp with time zone DEFAULT now()
);

-- Insert invalid IDs into backup table
INSERT INTO workout_clients_id_backup (id, original_id)
SELECT id, id
FROM workout_clients
WHERE LENGTH(id) > 36
ON CONFLICT (id) DO NOTHING;

-- Fix client IDs that are too long (truncate to 36 characters)
UPDATE workout_clients
SET id = SUBSTRING(id, 1, 36)
WHERE LENGTH(id) > 36 
  AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND NOT EXISTS (
    SELECT 1 FROM workout_clients wc2 
    WHERE wc2.id = SUBSTRING(workout_clients.id, 1, 36)
      AND wc2.ctid != workout_clients.ctid
  );

-- Fix references in workout_sessions table
UPDATE workout_sessions
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL 
  AND LENGTH(client_id) > 36
  AND client_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Fix references in workout_feedback table
UPDATE workout_feedback
SET client_id = SUBSTRING(client_id, 1, 36)
WHERE client_id IS NOT NULL 
  AND LENGTH(client_id) > 36
  AND client_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Add check constraint to prevent invalid UUIDs in the future
ALTER TABLE workout_clients 
ADD CONSTRAINT check_uuid_format 
CHECK (id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Add similar constraints to related tables
ALTER TABLE workout_sessions
ADD CONSTRAINT check_client_uuid_format
CHECK (client_id IS NULL OR client_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE workout_feedback
ADD CONSTRAINT check_feedback_client_uuid_format
CHECK (client_id IS NULL OR client_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Create function to validate UUIDs on insert/update
CREATE OR REPLACE FUNCTION validate_uuid_format()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NOT NULL AND LENGTH(NEW.id) != 36 THEN
    NEW.id = SUBSTRING(NEW.id, 1, 36);
  END IF;
  
  IF NEW.id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid UUID format: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate UUIDs on insert/update
CREATE TRIGGER validate_client_uuid
BEFORE INSERT OR UPDATE ON workout_clients
FOR EACH ROW
EXECUTE FUNCTION validate_uuid_format();

-- Report on fixed IDs
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM workout_clients_id_backup;
  
  IF fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % invalid client IDs. Check workout_clients_id_backup table for details.', fixed_count;
  ELSE
    RAISE NOTICE 'No invalid client IDs found.';
  END IF;
END $$;