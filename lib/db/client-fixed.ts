import { createBrowserClient } from '@supabase/ssr'

// Use environment variables with fallback for development
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function createClient() {
  try {
    if (!SUPABASE_ANON_KEY) {
      console.warn('Supabase anon key not configured, using limited mock client')
      throw new Error('Missing Supabase configuration')
    }
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    // Return a working mock that won't crash
    return {
      from: (table: string) => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (cb: any) => Promise.resolve({ data: [], error: null }).then(cb)
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
          }),
          then: (cb: any) => Promise.resolve({ data: null, error: { message: 'Mock client' } }).then(cb)
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'Mock client' } })
            })
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: { message: 'Mock client' } })
        })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: null, error: null, unsubscribe: () => {} })
      }
    } as any
  }
}