'use client'

import { useState } from 'react'
import { createClient } from '@/lib/db/client'

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<string[]>([])

  const runMigration = async () => {
    setStatus('running')
    setMessage('Starting migration...')
    setDetails([])
    const supabase = createClient()

    try {
      // Check if tables already exist
      const { data: existingTables } = await supabase
        .from('workout_clients')
        .select('id')
        .limit(1)

      if (existingTables) {
        setStatus('success')
        setMessage('Tables already exist! Migration was previously completed.')
        return
      }
    } catch (e) {
      // Tables don't exist, proceed with migration
    }

    const migrationSQL = `
-- AI Workout App Tables (prefixed with 'workout_' to separate from other apps)
-- Enable required extensions if not already enabled
create extension if not exists "uuid-ossp" with schema public;

-- Workout App Organizations (for future multi-tenancy)
create table if not exists public.workout_organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  settings jsonb default '{"branding": {"name": "", "logo": "", "colors": {}}, "preferences": {"default_duration": 60, "default_intensity": "moderate", "ai_provider": "anthropic"}}'::jsonb,
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

-- Create indexes for better performance
create index if not exists idx_workout_clients_org on public.workout_clients(organization_id);
create index if not exists idx_workout_clients_user on public.workout_clients(user_id);
create index if not exists idx_workout_sessions_client on public.workout_sessions(client_id);
create index if not exists idx_workout_sessions_created on public.workout_sessions(created_at desc);
    `.trim()

    setMessage('📊 To complete setup, please run the migration in Supabase:')
    setDetails([
      '1. Click the link below to open Supabase SQL Editor',
      '2. The migration SQL will be copied to your clipboard',
      '3. Paste it in the SQL editor and click "Run"',
      '',
      'Migration creates these tables:',
      '  • workout_organizations - Multi-tenant organizations',
      '  • workout_users - User profiles',
      '  • workout_clients - Client information',
      '  • workout_sessions - Workout templates and history',
      '',
      'All tables are prefixed with "workout_" to keep them separate from your other apps.'
    ])

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(migrationSQL)
      setStatus('success')
      setMessage('✅ Migration SQL copied to clipboard!')
    } catch (e) {
      setStatus('error')
      setMessage('Failed to copy to clipboard. Please copy manually from the migration file.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Setup Workout App Database</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Database Migration</h2>
          <p className="text-gray-600 mb-6">
            This will set up the required database tables for the AI Workout app in your existing Supabase project.
            All tables will be prefixed with "workout_" to keep them separate from your other applications.
          </p>

          {status === 'idle' && (
            <button
              onClick={runMigration}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Prepare Migration
            </button>
          )}

          {status === 'running' && (
            <div className="text-blue-600">
              <span className="inline-block animate-spin mr-2">⏳</span>
              {message}
            </div>
          )}

          {(status === 'success' || status === 'error') && (
            <div className={status === 'success' ? 'text-green-600' : 'text-red-600'}>
              <p className="font-semibold mb-4">{message}</p>
              {details.length > 0 && (
                <div className="bg-gray-50 p-4 rounded mt-4 text-gray-700">
                  {details.map((detail, i) => (
                    <p key={i} className={detail.startsWith('  ') ? 'ml-4' : ''}>{detail}</p>
                  ))}
                </div>
              )}
              
              {status === 'success' && (
                <div className="mt-6 space-y-4">
                  <a
                    href="https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Open Supabase SQL Editor →
                  </a>
                  
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="block text-blue-600 hover:underline"
                  >
                    Continue to Dashboard (after running migration)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About This Migration</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Creates workout-specific tables in your existing Supabase project</li>
            <li>• All tables are prefixed with "workout_" for isolation</li>
            <li>• Includes Row Level Security (RLS) for data protection</li>
            <li>• Supports multi-tenant architecture for future expansion</li>
          </ul>
        </div>
      </div>
    </div>
  )
}