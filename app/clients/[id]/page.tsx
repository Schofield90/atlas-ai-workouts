import { createClient } from '@/lib/db/server'
import ClientPageClient from './client-page'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClientPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createClient()
  
  // Clean the ID if needed
  const clientId = params.id.substring(0, 36)
  
  // Fetch client data on the server
  const { data: client, error } = await supabase
    .from('workout_clients')
    .select('*')
    .eq('id', clientId)
    .single()
  
  if (error || !client) {
    notFound()
  }
  
  // Fetch workouts for this client
  const { data: workouts } = await supabase
    .from('workout_sessions')
    .select('id, title, description, workout_type, difficulty, created_at, client_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  
  return <ClientPageClient 
    initialClient={client} 
    initialWorkouts={workouts || []} 
    clientId={clientId}
  />
}