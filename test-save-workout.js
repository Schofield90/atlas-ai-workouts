const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSave() {
  console.log('Testing workout save...')
  
  const testWorkout = {
    id: 'test-' + Date.now(),
    title: 'Test Workout',
    plan: {
      blocks: [
        {
          title: 'Main Workout',
          exercises: [
            { name: 'Push-ups', sets: 3, reps: '10' }
          ]
        }
      ]
    },
    source: 'test',
    version: 1
  }
  
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert(testWorkout)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Failed to save:', error)
  } else {
    console.log('✅ Workout saved successfully!')
    console.log('ID:', data.id)
    console.log('Title:', data.title)
    
    // Now try to fetch it back
    const { data: fetched, error: fetchError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', data.id)
      .single()
    
    if (fetched) {
      console.log('✅ Workout retrieved successfully!')
    }
  }
}

testSave()
