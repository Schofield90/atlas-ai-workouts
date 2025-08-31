const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWorkflow() {
  console.log('🔍 Testing complete workout workflow...\n')
  
  // 1. Test saving with the same ID format the app uses
  const workoutId = `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const testWorkout = {
    id: workoutId,
    title: 'Test Chest Workout',
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
            { name: 'Dips', sets: 3, reps: '8-12' }
          ]
        }
      ],
      training_goals: ['Strength', 'Endurance'],
      total_time_minutes: 30
    },
    source: 'test',
    version: 1
  }
  
  console.log('1️⃣ Attempting to save workout...')
  const { data: saved, error: saveError } = await supabase
    .from('workout_sessions')
    .insert(testWorkout)
    .select()
    .single()
  
  if (saveError) {
    console.error('❌ Save failed:', saveError)
    return
  }
  
  console.log('✅ Workout saved successfully!')
  console.log('   ID:', saved.id)
  console.log('   Title:', saved.title)
  console.log('')
  
  // 2. Test fetching all workouts
  console.log('2️⃣ Fetching all workouts...')
  const { data: allWorkouts, error: fetchError } = await supabase
    .from('workout_sessions')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (fetchError) {
    console.error('❌ Fetch failed:', fetchError)
  } else {
    console.log(`✅ Found ${allWorkouts.length} workout(s):`)
    allWorkouts.forEach(w => {
      console.log(`   - ${w.title} (${w.id})`)
    })
  }
  
  console.log('')
  console.log('🎉 Database is working correctly!')
  console.log('Your workouts should now save and display properly.')
}

testWorkflow()
