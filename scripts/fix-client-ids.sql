-- Check for invalid UUIDs in workout_clients table
-- A valid UUID should be 36 characters long (including hyphens)

-- First, let's see if there are any clients with invalid ID lengths
SELECT id, full_name, LENGTH(id) as id_length
FROM workout_clients
WHERE LENGTH(id) != 36
ORDER BY created_at DESC;

-- Check for the specific problematic ID
SELECT id, full_name, created_at
FROM workout_clients
WHERE id LIKE 'a3b7d016-350f-%'
ORDER BY created_at DESC;

-- If you find invalid IDs, you can update them with valid UUIDs
-- For example, to fix the ID with an extra character:
UPDATE workout_clients
SET id = SUBSTRING(id, 1, 36)
WHERE LENGTH(id) > 36 AND id LIKE '%-%-%-%-%';

-- Or generate new UUIDs for invalid entries:
-- UPDATE workout_clients
-- SET id = gen_random_uuid()
-- WHERE LENGTH(id) != 36;