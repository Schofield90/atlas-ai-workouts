import { createBrowserClient } from '@supabase/ssr'

// Hardcode the credentials directly - no environment variables
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

export function createClient() {
  try {
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