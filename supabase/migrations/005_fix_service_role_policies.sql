-- Fix RLS policies to allow service role operations for imports
-- The issue: default-user can't be created due to auth.users FK constraint
-- Solution: Allow service role bypass for all workout table operations

-- First, ensure RLS is enabled on all tables
ALTER TABLE public.workout_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies for workout_clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.workout_clients;
DROP POLICY IF EXISTS "Service role full access to clients" ON public.workout_clients;

-- Create comprehensive policies for workout_clients
-- 1. Service role has unrestricted access (for imports and admin operations)
CREATE POLICY "Service role full access to clients" 
ON public.workout_clients
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Authenticated users can manage their organization's clients
CREATE POLICY "Users manage organization clients" 
ON public.workout_clients
FOR ALL 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.workout_users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.workout_users 
    WHERE id = auth.uid()
  )
);

-- Drop existing problematic policies for workout_sessions
DROP POLICY IF EXISTS "Users can manage their own workouts" ON public.workout_sessions;
DROP POLICY IF EXISTS "Service role full access to sessions" ON public.workout_sessions;

-- Create comprehensive policies for workout_sessions
-- 1. Service role has unrestricted access
CREATE POLICY "Service role full access to sessions" 
ON public.workout_sessions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Authenticated users can manage their organization's sessions
CREATE POLICY "Users manage organization sessions" 
ON public.workout_sessions
FOR ALL 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.workout_users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.workout_users 
    WHERE id = auth.uid()
  )
);

-- Create policies for workout_users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.workout_users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.workout_users;

CREATE POLICY "Service role full access to users" 
ON public.workout_users
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own profile" 
ON public.workout_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Create policies for workout_organizations  
DROP POLICY IF EXISTS "Service role full access to organizations" ON public.workout_organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.workout_organizations;

CREATE POLICY "Service role full access to organizations" 
ON public.workout_organizations
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their organization" 
ON public.workout_organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM public.workout_users 
    WHERE id = auth.uid()
  )
);

-- Grant explicit permissions to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create a default organization if it doesn't exist
INSERT INTO public.workout_organizations (id, name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Note: We're NOT creating a default-user anymore since it violates FK constraints
-- The import process should use the actual authenticated user's ID and organization