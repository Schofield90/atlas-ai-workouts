import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { supabaseConfig } from '@/lib/config/supabase'

export function createClient() {
  const supabaseUrl = supabaseConfig.url
  const supabaseAnonKey = supabaseConfig.anonKey
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration')
    // Return a mock client to prevent app crash
    return {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => Promise.resolve({ error: { message: 'Supabase not configured' } })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null })
      }
    } as any
  }
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}