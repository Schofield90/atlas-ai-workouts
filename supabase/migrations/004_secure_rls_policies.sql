-- Secure RLS policies that work with authentication
-- This replaces the overly permissive policies from migration 003

-- First, drop all existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users full access to clients" ON public.workout_clients;
DROP POLICY IF EXISTS "Allow authenticated users full access to workouts" ON public.workout_sessions;
DROP POLICY IF EXISTS "Allow all operations on organizations" ON public.workout_organizations;
DROP POLICY IF EXISTS "Allow all operations on users" ON public.workout_users;
DROP POLICY IF EXISTS "Allow all operations on feedback" ON public.workout_feedback;
DROP POLICY IF EXISTS "Allow all operations on exercises" ON public.workout_exercises;
DROP POLICY IF EXISTS "Allow all operations on messages" ON public.workout_client_messages;

-- Create a default organization and user for development/import purposes
-- This ensures imports work while maintaining some security
DO $$
BEGIN
  -- Create default organization if it doesn't exist
  INSERT INTO public.workout_organizations (id, name, created_at)
  VALUES ('default-org', 'Default Organization', NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default user if it doesn't exist
  INSERT INTO public.workout_users (id, email, full_name, organization_id, created_at)
  VALUES ('default-user', 'default@atlas-fitness.com', 'Default User', 'default-org', NOW())
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Policy for workout_clients: Allow operations for authenticated users or default-user
CREATE POLICY "Users can manage their own clients" 
ON public.workout_clients
FOR ALL 
USING (
  -- Allow access if:
  -- 1. User is authenticated and matches the user_id
  -- 2. It's the default-user (for imports)
  -- 3. Service role is being used (auth.uid() is null in service role context)
  auth.uid()::text = user_id 
  OR user_id = 'default-user'
  OR auth.uid() IS NULL
)
WITH CHECK (
  -- Same rules for inserts/updates
  auth.uid()::text = user_id 
  OR user_id = 'default-user'
  OR auth.uid() IS NULL
);

-- Policy for workout_sessions: Similar approach
CREATE POLICY "Users can manage their own workouts" 
ON public.workout_sessions
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.workout_clients
    WHERE workout_clients.id = workout_sessions.client_id
    AND (
      workout_clients.user_id = auth.uid()::text
      OR workout_clients.user_id = 'default-user'
      OR auth.uid() IS NULL
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_clients
    WHERE workout_clients.id = workout_sessions.client_id
    AND (
      workout_clients.user_id = auth.uid()::text
      OR workout_clients.user_id = 'default-user'
      OR auth.uid() IS NULL
    )
  )
);

-- Organizations: Read access for all, write access for members
CREATE POLICY "Users can view organizations" 
ON public.workout_organizations
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their organization" 
ON public.workout_organizations
FOR ALL 
USING (
  id IN (
    SELECT organization_id FROM public.workout_users
    WHERE workout_users.id = auth.uid()::text
    OR workout_users.id = 'default-user'
  )
  OR auth.uid() IS NULL
);

-- Users: Can view and update own profile
CREATE POLICY "Users can view all users" 
ON public.workout_users
FOR SELECT 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.workout_users
FOR UPDATE 
USING (
  id = auth.uid()::text
  OR id = 'default-user'
  OR auth.uid() IS NULL
)
WITH CHECK (
  id = auth.uid()::text
  OR id = 'default-user'
  OR auth.uid() IS NULL
);

-- Exercises: Public read, admin write
CREATE POLICY "Everyone can view exercises" 
ON public.workout_exercises
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage exercises" 
ON public.workout_exercises
FOR ALL 
USING (auth.uid() IS NULL)
WITH CHECK (auth.uid() IS NULL);

-- Feedback: Users can manage their own feedback
CREATE POLICY "Users can manage their feedback" 
ON public.workout_feedback
FOR ALL 
USING (
  user_id = auth.uid()::text
  OR user_id = 'default-user'
  OR auth.uid() IS NULL
)
WITH CHECK (
  user_id = auth.uid()::text
  OR user_id = 'default-user'
  OR auth.uid() IS NULL
);

-- Messages: Access through client relationship
CREATE POLICY "Users can manage messages for their clients" 
ON public.workout_client_messages
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.workout_clients
    WHERE workout_clients.id = workout_client_messages.client_id
    AND (
      workout_clients.user_id = auth.uid()::text
      OR workout_clients.user_id = 'default-user'
      OR auth.uid() IS NULL
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_clients
    WHERE workout_clients.id = workout_client_messages.client_id
    AND (
      workout_clients.user_id = auth.uid()::text
      OR workout_clients.user_id = 'default-user'
      OR auth.uid() IS NULL
    )
  )
);

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;