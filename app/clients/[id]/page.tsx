import { notFound } from 'next/navigation'
import ClientDetailView from './client-detail-view'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// Server component to fetch data
async function getClient(id: string) {
  try {
    // Clean the ID - take only first 36 characters (UUID length)
    const cleanId = id.substring(0, 36)
    
    // Use direct fetch to Supabase REST API
    const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/workout_clients?id=eq.${cleanId}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return null
    }
    
    return data[0]
  } catch (error) {
    console.error('Error fetching client:', error)
    return null
  }
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await getClient(id)
  
  if (!client) {
    notFound()
  }
  
  return <ClientDetailView client={client} clientId={id.substring(0, 36)} />
}