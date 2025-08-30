import { createBrowserClient } from '@supabase/ssr'

// Use environment variables with fallback for development
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

export function createClient() {
  console.log('🔧 Creating Supabase client...')
  console.log('📍 SUPABASE_URL:', SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'MISSING')
  console.log('🔑 SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'MISSING')
  
  try {
    if (!SUPABASE_ANON_KEY) {
      console.warn('⚠️ Supabase anon key not configured, using limited mock client')
      throw new Error('Missing Supabase configuration')
    }
    const client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    console.log('✅ Supabase client created successfully')
    return client
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    // Return a working mock that won't crash but will log issues
    console.warn('🔄 Using mock Supabase client - database operations will return empty results')
    return {
      from: (table: string) => ({
        select: () => ({
          order: () => {
            console.warn(`🔄 Mock client: SELECT from ${table} - returning empty array`)
            return Promise.resolve({ data: [], error: null })
          },
          eq: () => ({
            single: () => {
              console.warn(`🔄 Mock client: SELECT single from ${table} - returning null`)
              return Promise.resolve({ data: null, error: null })
            }
          }),
          single: () => {
            console.warn(`🔄 Mock client: SELECT single from ${table} - returning null`)
            return Promise.resolve({ data: null, error: null })
          },
          then: (cb: any) => {
            console.warn(`🔄 Mock client: SELECT from ${table} - returning empty array`)
            return Promise.resolve({ data: [], error: null }).then(cb)
          }
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