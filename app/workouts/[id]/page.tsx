import { createServerClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import WorkoutViewer from './workout-viewer'

export default async function WorkoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch workout with client details
  const { data: workout, error } = await supabase
    .from('workouts')
    .select(`
      *,
      clients (
        full_name,
        email,
        goals,
        injuries,
        equipment
      )
    `)
    .eq('id', id)
    .single()

  if (error || !workout) {
    redirect('/dashboard')
  }

  return <WorkoutViewer workout={workout} />
}