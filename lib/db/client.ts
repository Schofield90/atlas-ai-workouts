import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  // Try both variable names that might be set in Vercel
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    })
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