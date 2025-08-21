-- Enable required extensions
create extension if not exists vector with schema public;
create extension if not exists "uuid-ossp" with schema public;

-- Organizations table for multi-tenancy (unbranded)
create table public.organizations (
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
      "default_intensity": "moderate"
    }
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Users with organization association
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role text check (role in ('owner', 'coach', 'staff')) default 'coach',
  full_name text,
  email text,
  created_at timestamptz default now()
);

-- Clients tied to an organization
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  age int,
  sex text check (sex in ('male','female','other') or sex is null),
  height_cm int,
  weight_kg numeric,
  goals text,
  injuries text,
  equipment jsonb default '[]'::jsonb,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages for RAG context
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  author_user_id uuid references public.users(id),
  role text check (role in ('client','coach','system')) default 'coach',
  content text not null,
  created_at timestamptz default now()
);

-- Message embeddings for vector search
create table public.message_embeddings (
  message_id uuid primary key references public.messages(id) on delete cascade,
  embedding vector(3072),
  created_at timestamptz default now()
);

-- Exercise catalog
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  modality text,
  body_part text[],
  equipment text[],
  level text check (level in ('beginner','intermediate','advanced')),
  canonical_cues text[],
  video_url text,
  created_at timestamptz default now()
);

-- Workouts with versioning
create table public.workouts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  program_phase text,
  plan jsonb not null,
  source text check (source in ('ai','manual','ai_edited')),
  version int default 1,
  parent_id uuid references public.workouts(id),
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

-- Workout feedback
create table public.feedback (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references public.workouts(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  rating int check (rating between 1 and 5),
  intensity_rating numeric check (intensity_rating between 1 and 10),
  volume_rating numeric check (volume_rating between 1 and 10),
  duration_minutes int,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Model preferences (per-client and global)
create table public.model_preferences (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  learned_patterns jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Create indexes for performance
create index idx_clients_organization on public.clients(organization_id);
create index idx_messages_client on public.messages(client_id);
create index idx_workouts_client on public.workouts(client_id);
create index idx_feedback_workout on public.feedback(workout_id);
create index idx_model_preferences_client on public.model_preferences(client_id);

-- Enable Row Level Security
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.messages enable row level security;
alter table public.message_embeddings enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.feedback enable row level security;
alter table public.model_preferences enable row level security;

-- RLS Policies

-- Organizations: users can only see their own org
create policy "Users can view own organization"
on public.organizations for select
using (
  id in (
    select organization_id from public.users
    where id = auth.uid()
  )
);

create policy "Owners can update organization"
on public.organizations for update
using (
  id in (
    select organization_id from public.users
    where id = auth.uid() and role = 'owner'
  )
)
with check (
  id in (
    select organization_id from public.users
    where id = auth.uid() and role = 'owner'
  )
);

-- Users: can view colleagues in same org
create policy "Users can view colleagues"
on public.users for select
using (
  organization_id in (
    select organization_id from public.users
    where id = auth.uid()
  )
);

-- Clients: organization-scoped access
create policy "Organization members can manage clients"
on public.clients for all
using (
  organization_id in (
    select organization_id from public.users
    where id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from public.users
    where id = auth.uid()
  )
);

-- Messages: access through client relationship
create policy "Access messages through client"
on public.messages for all
using (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
);

-- Message embeddings: access through messages
create policy "Access embeddings through messages"
on public.message_embeddings for all
using (
  exists (
    select 1 from public.messages m
    join public.clients c on c.id = m.client_id
    join public.users u on u.organization_id = c.organization_id
    where m.id = message_id and u.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.messages m
    join public.clients c on c.id = m.client_id
    join public.users u on u.organization_id = c.organization_id
    where m.id = message_id and u.id = auth.uid()
  )
);

-- Exercises: public read, admin write
create policy "Everyone can view exercises"
on public.exercises for select
using (true);

-- Workouts: organization-scoped through client
create policy "Access workouts through client"
on public.workouts for all
using (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
);

-- Feedback: organization-scoped through client
create policy "Access feedback through client"
on public.feedback for all
using (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where c.id = client_id and u.id = auth.uid()
  )
);

-- Model preferences: organization-scoped
create policy "Access model preferences"
on public.model_preferences for all
using (
  organization_id in (
    select organization_id from public.users
    where id = auth.uid()
  )
  or
  client_id in (
    select id from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where u.id = auth.uid()
  )
)
with check (
  organization_id in (
    select organization_id from public.users
    where id = auth.uid()
  )
  or
  client_id in (
    select id from public.clients c
    join public.users u on u.organization_id = c.organization_id
    where u.id = auth.uid()
  )
);

-- Vector similarity search function
create or replace function public.search_messages(
  p_client_id uuid,
  p_query_embedding vector,
  p_match_count int default 10,
  p_similarity_threshold float default 0.78
)
returns table(
  message_id uuid,
  content text,
  role text,
  similarity float
)
language sql stable
as $$
  select 
    m.id as message_id,
    m.content,
    m.role,
    1 - (me.embedding <=> p_query_embedding) as similarity
  from public.messages m
  join public.message_embeddings me on me.message_id = m.id
  where m.client_id = p_client_id
    and 1 - (me.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by me.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- Updated timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.handle_updated_at();

create trigger handle_clients_updated_at
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

create trigger handle_model_preferences_updated_at
  before update on public.model_preferences
  for each row execute procedure public.handle_updated_at();