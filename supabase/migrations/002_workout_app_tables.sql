-- AI Workout App Tables (prefixed with 'workout_' to separate from other apps)
-- Enable required extensions if not already enabled
create extension if not exists "uuid-ossp" with schema public;

-- Workout App Organizations (for future multi-tenancy)
create table if not exists public.workout_organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  settings jsonb default '{
    "branding": {
      "name": "",
      "logo": "",
      "colors": {}
    },
    "preferences": {
      "default_duration": 60,
      "default_intensity": "moderate",
      "ai_provider": "anthropic"
    }
  }'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workout App Users
create table if not exists public.workout_users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.workout_organizations(id) on delete cascade,
  role text check (role in ('owner', 'coach', 'staff')) default 'coach',
  full_name text,
  email text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workout App Clients
create table if not exists public.workout_clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.workout_organizations(id) on delete cascade,
  user_id uuid references public.workout_users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  age int,
  sex text check (sex in ('male','female','other') or sex is null),
  height_cm int,
  weight_kg numeric,
  goals text,
  injuries text,
  equipment jsonb default '[]'::jsonb,
  preferences jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workout Templates/Sessions
create table if not exists public.workout_sessions (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.workout_clients(id) on delete cascade,
  user_id uuid references public.workout_users(id) on delete set null,
  title text not null,
  description text,
  workout_type text,
  duration_minutes int,
  difficulty text check (difficulty in ('beginner','intermediate','advanced') or difficulty is null),
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  ai_generated boolean default false,
  ai_prompt text,
  source text check (source in ('ai','manual','ai_edited') or source is null),
  version int default 1,
  parent_id uuid references public.workout_sessions(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workout Feedback
create table if not exists public.workout_feedback (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references public.workout_sessions(id) on delete cascade,
  client_id uuid references public.workout_clients(id) on delete cascade,
  rating int check (rating >= 1 and rating <= 5),
  difficulty_rating text check (difficulty_rating in ('too_easy','just_right','too_hard') or difficulty_rating is null),
  completed boolean default false,
  completion_percentage int check (completion_percentage >= 0 and completion_percentage <= 100),
  feedback text,
  created_at timestamptz default now() not null
);

-- Exercise Library
create table if not exists public.workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  muscle_groups text[],
  equipment text[],
  difficulty text check (difficulty in ('beginner','intermediate','advanced') or difficulty is null),
  instructions text,
  tips text[],
  video_url text,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Client Messages/Notes (for context)
create table if not exists public.workout_client_messages (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.workout_clients(id) on delete cascade,
  user_id uuid references public.workout_users(id) on delete set null,
  message text not null,
  message_type text check (message_type in ('note','goal','injury','feedback','general') or message_type is null) default 'general',
  created_at timestamptz default now() not null
);

-- Create indexes for better performance
create index if not exists idx_workout_clients_org on public.workout_clients(organization_id);
create index if not exists idx_workout_clients_user on public.workout_clients(user_id);
create index if not exists idx_workout_sessions_client on public.workout_sessions(client_id);
create index if not exists idx_workout_sessions_created on public.workout_sessions(created_at desc);
create index if not exists idx_workout_feedback_workout on public.workout_feedback(workout_id);
create index if not exists idx_workout_feedback_client on public.workout_feedback(client_id);
create index if not exists idx_workout_messages_client on public.workout_client_messages(client_id);

-- Row Level Security (RLS) Policies
alter table public.workout_organizations enable row level security;
alter table public.workout_users enable row level security;
alter table public.workout_clients enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_feedback enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_client_messages enable row level security;

-- Policy: Users can see their own organization's data
create policy "Users can view own organization" on public.workout_organizations
  for select using (
    exists (
      select 1 from public.workout_users
      where workout_users.organization_id = workout_organizations.id
      and workout_users.id = auth.uid()
    )
  );

create policy "Users can view own profile" on public.workout_users
  for all using (id = auth.uid());

create policy "Users can manage their organization's clients" on public.workout_clients
  for all using (
    exists (
      select 1 from public.workout_users
      where workout_users.organization_id = workout_clients.organization_id
      and workout_users.id = auth.uid()
    )
  );

create policy "Users can manage their organization's workouts" on public.workout_sessions
  for all using (
    exists (
      select 1 from public.workout_clients
      join public.workout_users on workout_users.organization_id = workout_clients.organization_id
      where workout_clients.id = workout_sessions.client_id
      and workout_users.id = auth.uid()
    )
  );

create policy "Users can manage their organization's feedback" on public.workout_feedback
  for all using (
    exists (
      select 1 from public.workout_clients
      join public.workout_users on workout_users.organization_id = workout_clients.organization_id
      where workout_clients.id = workout_feedback.client_id
      and workout_users.id = auth.uid()
    )
  );

create policy "All authenticated users can view exercises" on public.workout_exercises
  for select using (auth.uid() is not null);

create policy "Users can manage their organization's messages" on public.workout_client_messages
  for all using (
    exists (
      select 1 from public.workout_clients
      join public.workout_users on workout_users.organization_id = workout_clients.organization_id
      where workout_clients.id = workout_client_messages.client_id
      and workout_users.id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
create or replace function public.update_workout_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_workout_organizations_updated_at
  before update on public.workout_organizations
  for each row execute function public.update_workout_updated_at();

create trigger update_workout_users_updated_at
  before update on public.workout_users
  for each row execute function public.update_workout_updated_at();

create trigger update_workout_clients_updated_at
  before update on public.workout_clients
  for each row execute function public.update_workout_updated_at();

create trigger update_workout_sessions_updated_at
  before update on public.workout_sessions
  for each row execute function public.update_workout_updated_at();

create trigger update_workout_exercises_updated_at
  before update on public.workout_exercises
  for each row execute function public.update_workout_updated_at();