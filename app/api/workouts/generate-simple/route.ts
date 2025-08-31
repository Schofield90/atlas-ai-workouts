import { NextRequest, NextResponse } from 'next/server'
import { AIClient } from '@/lib/ai/provider'
import { WORKOUT_SYSTEM_PROMPT } from '@/lib/ai/prompting'
import { WorkoutPlanSchema } from '@/lib/ai/schema'

// Handle GET requests (for debugging)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'This endpoint only accepts POST requests',
    message: 'Use POST to generate workouts',
    debug: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      method: 'GET received, POST required'
    }
  }, { status: 405 })
}

// Helper function to get appropriate exercises based on focus
function getFallbackExercises(focus: string, equipment: string[] = []) {
  const focusLower = focus.toLowerCase()
  const hasEquipment = equipment.length > 0
  
  // Bicep exercises
  if (focusLower.includes('bicep')) {
    if (hasEquipment && (equipment.includes('dumbbells') || equipment.includes('barbell'))) {
      return [
        { name: 'Dumbbell Bicep Curls', sets: 4, reps: '12-15', rest_seconds: 60 },
        { name: 'Hammer Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Concentration Curls', sets: 3, reps: '12-15', rest_seconds: 45 },
        { name: '21s Bicep Curls', sets: 2, reps: '21', rest_seconds: 90 }
      ]
    }
    return [
      { name: 'Chin-ups (underhand grip)', sets: 3, reps: '8-12', rest_seconds: 90 },
      { name: 'Resistance Band Curls', sets: 4, reps: '15-20', rest_seconds: 45 },
      { name: 'Isometric Bicep Hold', sets: 3, time_seconds: 30, rest_seconds: 45 },
      { name: 'Bodyweight Curls (using table edge)', sets: 3, reps: '10-15', rest_seconds: 60 }
    ]
  }
  
  // Tricep exercises
  if (focusLower.includes('tricep')) {
    if (hasEquipment && (equipment.includes('dumbbells') || equipment.includes('barbell'))) {
      return [
        { name: 'Tricep Dips', sets: 4, reps: '12-15', rest_seconds: 60 },
        { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', rest_seconds: 45 },
        { name: 'Close-Grip Press', sets: 3, reps: '10-12', rest_seconds: 90 }
      ]
    }
    return [
      { name: 'Diamond Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
      { name: 'Tricep Dips (using chair)', sets: 3, reps: '12-15', rest_seconds: 60 },
      { name: 'Pike Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
      { name: 'Tricep Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 }
    ]
  }
  
  // Bicep AND Tricep
  if ((focusLower.includes('bicep') && focusLower.includes('tricep')) || focusLower.includes('arms')) {
    if (hasEquipment) {
      return [
        { name: 'Superset: Bicep Curls', sets: 3, reps: '12', rest_seconds: 0 },
        { name: 'Superset: Tricep Dips', sets: 3, reps: '12', rest_seconds: 90 },
        { name: 'Hammer Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: '21s Bicep Curls', sets: 2, reps: '21', rest_seconds: 60 },
        { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', rest_seconds: 60 }
      ]
    }
    return [
      { name: 'Chin-ups', sets: 3, reps: '8-10', rest_seconds: 90 },
      { name: 'Diamond Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
      { name: 'Resistance Band Curls', sets: 3, reps: '15', rest_seconds: 45 },
      { name: 'Tricep Dips', sets: 3, reps: '12-15', rest_seconds: 60 },
      { name: 'Isometric Bicep Hold', sets: 2, time_seconds: 30, rest_seconds: 45 },
      { name: 'Pike Push-ups', sets: 3, reps: '10', rest_seconds: 60 }
    ]
  }
  
  // Default full body
  return [
    { name: 'Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
    { name: 'Squats', sets: 3, reps: '15-20', rest_seconds: 60 },
    { name: 'Plank', sets: 3, time_seconds: 30, rest_seconds: 45 },
    { name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60 }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, clientId, duration = 60, intensity = 'moderate', focus = '', equipment = [], context, provider } = body

    // Get client from request body (passed from frontend)
    const client = body.client || {
      full_name: 'Guest User',
      goals: 'General fitness',
      injuries: '',
      equipment: equipment
    }

    // Build prompt with context
    let prompt = ''
    
    // Log context for debugging
    console.log('Context received:', {
      hasContext: !!context,
      textSectionsCount: context?.textSections?.length || 0,
      documentsCount: context?.documents?.length || 0,
      contextName: context?.name || 'none'
    })
    
    // Add project context if provided
    if (context) {
      prompt += `CONTEXT AND BACKGROUND:\n`
      
      // Add legacy text context if exists
      if (context.textContext) {
        prompt += `${context.textContext}\n\n`
      }
      
      // Add new text sections (SOPs, ChatGPT conversations, etc.)
      if (context.textSections && context.textSections.length > 0) {
        prompt += `KNOWLEDGE BASE:\n`
        console.log(`Adding ${context.textSections.length} SOPs/text sections to prompt`)
        context.textSections.forEach((section: any) => {
          const categoryLabels: Record<string, string> = {
            'sop': 'SOP',
            'chat': 'Chat Export',
            'guide': 'Training Guide',
            'notes': 'Notes'
          }
          const categoryLabel = categoryLabels[section.category] || 'Context'
          
          prompt += `\n[${categoryLabel}: ${section.title}]\n`
          prompt += `${section.content.substring(0, 8000)}\n`
        })
        prompt += `\n`
      }
      
      // Add uploaded documents
      if (context.documents && context.documents.length > 0) {
        prompt += `REFERENCE DOCUMENTS:\n`
        console.log(`Adding ${context.documents.length} documents to prompt`)
        context.documents.forEach((doc: any) => {
          prompt += `[${doc.name}]:\n${doc.content.substring(0, 5000)}\n\n`
        })
      }
      
      prompt += `---\n\n`
    }
    
    prompt += `Generate a workout plan for:

Client: ${client.full_name}
Title: ${title}
Goals: ${client.goals || 'General fitness'}
Available Equipment: ${Array.isArray(equipment) && equipment.length > 0 ? equipment.join(', ') : 'bodyweight only'}
Injuries/Limitations: ${client.injuries || 'none'}
Duration: ${duration} minutes
Intensity: ${intensity}
Focus: ${focus || 'full body'}

IMPORTANT: This workout MUST focus on ${focus || 'full body'}. If the focus is a specific muscle group (like biceps, triceps, chest, etc.), the main workout block MUST contain exercises targeting those specific muscles.

Generate a complete workout plan as JSON with this exact structure:
{
  "blocks": [
    { "title": "Warm-up", "exercises": [...] },
    { "title": "Main Workout", "exercises": [...exercises focusing on ${focus || 'full body'}...] },
    { "title": "Cool-down", "exercises": [...] }
  ],
  "training_goals": [...],
  "constraints": [...],
  "intensity_target": "${intensity}"
}`

    // Generate workout with AI
    console.log('=== AI WORKOUT GENERATION ===')
    console.log('Focus requested:', focus || 'full body')
    console.log('Equipment:', equipment)
    console.log('Prompt length:', prompt.length, 'characters')
    
    const aiClient = new AIClient(provider)
    console.log('Using AI provider:', provider || process.env.AI_PROVIDER || 'auto')
    console.log('Calling AI with prompt...')
    
    const response = await aiClient.generateText(
      WORKOUT_SYSTEM_PROMPT,
      prompt,
      { 
        temperature: 0.7,
        jsonMode: true 
      }
    )
    
    console.log('AI responded successfully:', !!response.content)
    console.log('Response length:', response.content?.length || 0, 'characters')
    console.log('AI Provider used:', aiClient.getProvider ? aiClient.getProvider() : 'unknown')

    // Parse and validate the generated workout
    let workoutPlan
    try {
      // Try to extract JSON from the response if it contains extra text
      let jsonContent = response.content || '{}'
      
      console.log('Raw AI response:', jsonContent)
      
      // Remove any markdown code blocks if present
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      // Look for JSON structure in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }
      
      const parsed = JSON.parse(jsonContent)
      console.log('Parsed workout plan:', parsed)
      
      workoutPlan = {
        ...parsed,
        client_id: clientId || 'guest',
        title: title,
        total_time_minutes: duration,
      }
      
      // Ensure blocks array exists
      if (!workoutPlan.blocks || !Array.isArray(workoutPlan.blocks)) {
        console.warn('No blocks in AI response, using fallback')
        throw new Error('Invalid workout structure from AI')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('AI Response was:', response.content)
      
      // Return a fallback workout that respects the requested focus
      console.error('Using fallback workout for focus:', focus)
      const fallbackExercises = getFallbackExercises(focus || 'full body', equipment)
      
      workoutPlan = {
        client_id: clientId || 'guest',
        title: title,
        program_phase: 'General Training',
        blocks: [
          {
            title: 'Warm-up',
            exercises: [
              { name: 'Arm Circles', sets: 2, reps: '10 each direction' },
              { name: 'Wrist Rotations', sets: 1, reps: '10 each direction' },
              { name: 'Light Cardio', sets: 1, time_seconds: 120 }
            ]
          },
          {
            title: `Main Workout - ${focus || 'Full Body'}`,
            exercises: fallbackExercises
          },
          {
            title: 'Cool-down',
            exercises: [
              { name: 'Arm Stretches', sets: 1, time_seconds: 30, notes: ['Each arm'] },
              { name: 'Shoulder Stretches', sets: 1, time_seconds: 30, notes: ['Each side'] },
              { name: 'Deep Breathing', sets: 1, time_seconds: 60 }
            ]
          }
        ],
        total_time_minutes: duration,
        training_goals: [`${focus || 'General'} training`, client.goals || 'General fitness'],
        constraints: client.injuries ? [client.injuries] : [],
        intensity_target: intensity,
        version: 1
      }
    }

    // Create workout with unique ID and proper structure
    const workout = {
      id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      plan: workoutPlan,
      clients: client,
      source: 'ai',
      version: 1,
      created_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      workout: workout,
      provider: aiClient.getProvider ? aiClient.getProvider() : 'unknown'
    })
  } catch (error) {
    console.error('Workout generation error:', error)
    
    // We can't access body here, so we return a basic fallback
    console.error('Critical error, using emergency fallback workout')
    const fallbackWorkout = {
      id: `workout-${Date.now()}`,
      title: 'Emergency Workout',
      plan: {
        blocks: [
          {
            title: 'Full Body Workout',
            exercises: [
              { name: 'Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
              { name: 'Squats', sets: 3, reps: '15-20', rest_seconds: 60 },
              { name: 'Plank', sets: 3, time_seconds: 30, rest_seconds: 45 },
              { name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60 }
            ]
          }
        ],
        training_goals: ['General fitness'],
        total_time_minutes: 60
      },
      clients: { full_name: 'Guest User' },
      source: 'fallback',
      created_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      workoutId: fallbackWorkout.id,
      workout: fallbackWorkout,
    })
  }
}