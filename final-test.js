const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWorkflow() {
  console.log('🎯 Final Test - Saving a workout...\n')
  
  // Use the same ID format the app uses
  const workoutId = `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const testWorkout = {
    id: workoutId,
    title: 'Test Chest Workout - Production Ready',
    plan: {
      blocks: [
        {
          title: 'Warm-up',
          exercises: [
            { name: 'Arm Circles', sets: 2, reps: '10' }
          ]
        },
        {
          title: 'Main Workout',
          exercises: [
            { name: 'Push-ups', sets: 3, reps: '10-15' },
            { name: 'Bench Press', sets: 4, reps: '8-10' },
            { name: 'Dips', sets: 3, reps: '8-12' }
          ]
        },
        {
          title: 'Cool-down',
          exercises: [
            { name: 'Chest Stretch', sets: 1, time_seconds: 30 }
          ]
        }
      ],
      training_goals: ['Strength', 'Muscle Growth'],
      total_time_minutes: 45
    },
    client_id: null,  // No client linked for this test
    source: 'test',
    version: 1
  }
  
  console.log('Saving workout with ID:', workoutId)
  const { data: saved, error: saveError } = await supabase
    .from('workout_sessions')
    .insert(testWorkout)
    .select()
    .single()
  
  if (saveError) {
    console.error('❌ Save failed:', saveError)
    return false
  }
  
  console.log('✅ Workout saved successfully!')
  console.log('   Title:', saved.title)
  console.log('   Created at:', saved.created_at)
  console.log('')
  
  // Fetch all workouts to verify
  console.log('📋 Fetching all workouts...')
  const { data: allWorkouts, error: fetchError } = await supabase
    .from('workout_sessions')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (fetchError) {
    console.error('❌ Fetch failed:', fetchError)
    return false
  }
  
  console.log(`✅ Found ${allWorkouts.length} workout(s) in database:`)
  allWorkouts.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.title}`)
    console.log(`      ID: ${w.id}`)
    console.log(`      Created: ${new Date(w.created_at).toLocaleString()}`)
  })
  
  console.log('')
  console.log('🎉 SUCCESS! Your database is working perfectly!')
  console.log('✅ Workouts can now be saved and retrieved')
  console.log('✅ The app should work properly in production')
  
  return true
}

testWorkflow()
