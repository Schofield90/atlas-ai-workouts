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
  
  // Core exercises
  if (focusLower.includes('core') || focusLower.includes('abs')) {
    return [
      { name: 'Plank', sets: 3, time_seconds: 45, rest_seconds: 30 },
      { name: 'Russian Twists', sets: 3, reps: '20', rest_seconds: 45 },
      { name: 'Dead Bug', sets: 3, reps: '10 each side', rest_seconds: 45 },
      { name: 'Mountain Climbers', sets: 3, reps: '20', rest_seconds: 60 },
      { name: 'Bicycle Crunches', sets: 3, reps: '15 each side', rest_seconds: 45 },
      { name: 'Hollow Body Hold', sets: 3, time_seconds: 30, rest_seconds: 45 }
    ]
  }
  
  // Bicep AND Core combination
  if (focusLower.includes('bicep') && focusLower.includes('core')) {
    if (hasEquipment && (equipment.includes('dumbbells') || equipment.includes('barbell'))) {
      return [
        { name: 'Dumbbell Bicep Curls', sets: 3, reps: '12-15', rest_seconds: 60 },
        { name: 'Plank', sets: 3, time_seconds: 45, rest_seconds: 45 },
        { name: 'Hammer Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Russian Twists with weight', sets: 3, reps: '20', rest_seconds: 45 },
        { name: 'Concentration Curls', sets: 3, reps: '12-15', rest_seconds: 45 },
        { name: 'Dead Bug', sets: 3, reps: '10 each side', rest_seconds: 45 }
      ]
    }
    return [
      { name: 'Chin-ups (underhand grip)', sets: 3, reps: '8-12', rest_seconds: 90 },
      { name: 'Plank', sets: 3, time_seconds: 45, rest_seconds: 45 },
      { name: 'Resistance Band Curls', sets: 3, reps: '15-20', rest_seconds: 45 },
      { name: 'Mountain Climbers', sets: 3, reps: '20', rest_seconds: 60 },
      { name: 'Isometric Bicep Hold', sets: 3, time_seconds: 30, rest_seconds: 45 },
      { name: 'Bicycle Crunches', sets: 3, reps: '15 each side', rest_seconds: 45 }
    ]
  }
  
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
    const { title, clientId, duration = 60, intensity = 'moderate', focus = '', equipment = [], context, provider, feedback } = body

    // Get client data directly from database to ensure accuracy
    let client = {
      full_name: 'Guest User',
      goals: 'General fitness',
      injuries: '',
      equipment: equipment
    }

    if (clientId && clientId !== 'guest') {
      try {
        const { createClient } = await import('@/lib/db/client-fixed')
        const supabase = createClient()
        
        const { data: clientData, error } = await supabase
          .from('workout_clients')
          .select('*')
          .eq('id', clientId)
          .single()
        
        if (clientData && !error) {
          // Clean up injuries data - remove if it's "No injuries reported"
          let cleanInjuries = clientData.injuries || ''
          if (cleanInjuries === 'No injuries reported' || cleanInjuries === 'none') {
            cleanInjuries = ''
          }
          
          client = {
            full_name: clientData.full_name,
            goals: clientData.goals || 'General fitness',
            injuries: cleanInjuries,
            equipment: clientData.equipment || equipment
          }
          console.log('✅ Using client from database:', {
            name: client.full_name,
            id: clientId,
            injuries: client.injuries || 'NONE',
            goals: client.goals
          })
        } else {
          console.warn('⚠️ Client not found in database, using Guest User:', clientId, error)
        }
      } catch (dbError) {
        console.error('Database error fetching client:', dbError)
      }
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
    
    // Add feedback context if regenerating
    if (feedback) {
      prompt += `\nIMPORTANT FEEDBACK FROM PREVIOUS WORKOUT:\n`
      prompt += `Previous Rating: ${feedback.rating}/5 (${feedback.rating === 1 ? 'Too Easy' : feedback.rating === 2 ? 'Easy' : feedback.rating === 3 ? 'Just Right' : feedback.rating === 4 ? 'Challenging' : 'Too Hard'})\n`
      prompt += `Category: ${feedback.category}\n`
      prompt += `Specific Feedback: "${feedback.feedback}"\n`
      prompt += `\nPLEASE ADJUST THE WORKOUT BASED ON THIS FEEDBACK:\n`
      
      // Add specific instructions based on rating
      if (feedback.rating <= 2) {
        prompt += `- The previous workout was too easy. Increase difficulty by:\n`
        prompt += `  * Adding more challenging exercises\n`
        prompt += `  * Increasing sets/reps\n`
        prompt += `  * Reducing rest times\n`
        prompt += `  * Adding progressive overload\n`
      } else if (feedback.rating >= 4) {
        prompt += `- The previous workout was too hard. Reduce difficulty by:\n`
        prompt += `  * Using easier exercise variations\n`
        prompt += `  * Reducing sets/reps\n`
        prompt += `  * Increasing rest times\n`
        prompt += `  * Adding more warm-up\n`
      }
      
      prompt += `\nIncorporate the specific feedback: "${feedback.feedback}"\n\n`
      prompt += `---\n\n`
    }
    
    prompt += `Generate a workout plan for:

Client: ${client.full_name}
Title: ${title}
Goals: ${client.goals || 'General fitness'}
Available Equipment: ${Array.isArray(equipment) && equipment.length > 0 ? equipment.join(', ') : (client.equipment && client.equipment.length > 0 ? client.equipment.join(', ') : 'bodyweight only')}
Injuries/Limitations: ${client.injuries || 'none'}
Duration: ${duration} minutes
Intensity: ${intensity}
Focus: ${focus || 'full body'}

CRITICAL REQUIREMENTS:
1. This workout MUST focus on ${focus || 'full body'}. 
   ${focus && focus.toLowerCase().includes('bicep') ? '- Include bicep-focused exercises like curls, hammer curls, concentration curls, etc.' : ''}
   ${focus && focus.toLowerCase().includes('core') ? '- Include core-focused exercises like planks, crunches, russian twists, mountain climbers, etc.' : ''}
   ${focus && focus.toLowerCase().includes('bicep') && focus.toLowerCase().includes('core') ? '- Mix bicep exercises (curls) with core exercises (planks, crunches) evenly' : ''}

2. MUST respect client injuries/limitations: ${client.injuries || 'none'}
   - If client has injuries, avoid exercises that could aggravate them
   - Modify exercises or provide alternatives as needed
   - Include specific constraints in the "constraints" field

3. Equipment: Use only the equipment listed above. If none listed, use bodyweight only.

4. The "constraints" field MUST list actual client limitations from their profile, NOT generic constraints.

5. SINGLE BLOCK STRUCTURE: Create the ENTIRE workout in ONE block. Do NOT separate into warm-up, main, cool-down or any other segments. All exercises should be in a single continuous list.

Generate a complete workout plan as JSON with this EXACT structure:
{
  "blocks": [
    { 
      "title": "${title}", 
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "12-15", "rest_seconds": 60 },
        { "name": "Another Exercise", "sets": 3, "reps": "10-12", "rest_seconds": 60 }
        // ALL exercises in ONE block - no separation
      ] 
    }
  ],
  "training_goals": [${client.goals ? `"${client.goals}"` : '"General fitness"'}],
  "constraints": [${client.injuries && client.injuries !== '' && client.injuries !== 'none' && client.injuries !== 'No injuries reported' ? `"${client.injuries}"` : ''}],
  "intensity_target": "${intensity}"
}

CRITICAL: 
- Use "sets", "reps", "rest_seconds" or "time_seconds" fields for exercises
- constraints should be EMPTY [] if client has no injuries
- Do NOT add random medical conditions to constraints`

    // Generate workout with AI
    console.log('=== AI WORKOUT GENERATION ===')
    console.log('Focus requested:', focus || 'full body')
    console.log('Equipment:', equipment)
    console.log('Prompt length:', prompt.length, 'characters')
    console.log('OpenAI key set:', !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-test-key-123')
    console.log('Anthropic key set:', !!process.env.ANTHROPIC_API_KEY)
    
    let response
    let aiClient: any
    try {
      aiClient = new AIClient(provider)
      console.log('Using AI provider:', provider || process.env.AI_PROVIDER || 'auto')
      console.log('Calling AI with prompt...')
      
      response = await aiClient.generateText(
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
    } catch (aiError: any) {
      console.error('AI GENERATION FAILED:', aiError.message)
      console.error('Stack:', aiError.stack)
      throw new Error('AI generation failed - using fallback')
    }

    // Parse and validate the generated workout
    let workoutPlan
    try {
      // Try to extract JSON from the response if it contains extra text
      let jsonContent = response.content || '{}'
      
      console.log('Raw AI response (first 500 chars):', jsonContent.substring(0, 500))
      
      // Remove any markdown code blocks if present
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      // Look for JSON structure in the response
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }
      
      let parsed = JSON.parse(jsonContent)
      console.log('Parsed workout first block:', JSON.stringify(parsed.blocks?.[0], null, 2))
      
      // Check if the response has wrapped the blocks in another object
      if (!parsed.blocks && parsed.exercises) {
        console.warn('AI response has exercises array instead of blocks, converting...')
        parsed = {
          blocks: [
            { title: 'Warm-up', exercises: [] },
            { title: 'Main Workout', exercises: parsed.exercises },
            { title: 'Cool-down', exercises: [] }
          ],
          training_goals: parsed.training_goals || [client.goals || 'General fitness'],
          constraints: parsed.constraints || [],
          intensity_target: parsed.intensity_target || intensity
        }
      }
      
      // Validate and fix exercise structure
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        parsed.blocks = parsed.blocks.map((block: any) => {
          if (block.exercises && Array.isArray(block.exercises)) {
            // Check if exercises are strings and convert to objects
            block.exercises = block.exercises.map((exercise: any) => {
              if (typeof exercise === 'string') {
                console.warn('Exercise is string, converting:', exercise)
                // Try to parse string format like "Push-ups 3x10"
                const match = exercise.match(/^(.+?)\s+(\d+)x(\d+)$/) || 
                             exercise.match(/^(.+?)\s+(\d+)\s*(?:sets?|reps?)$/) ||
                             exercise.match(/^(.+?)\s+(\d+)sec$/)
                if (match) {
                  return {
                    name: match[1].trim(),
                    sets: parseInt(match[2]) || 3,
                    reps: match[3] || '10-15'
                  }
                }
                return { name: exercise, sets: 3, reps: '10-15' }
              }
              return exercise
            })
          }
          return block
        })
      }
      
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
      
      // Create single block with all exercises
      const workoutBlocks = [
        {
          title: title,
          exercises: fallbackExercises
        }
      ]
      
      
      workoutPlan = {
        client_id: clientId || 'guest',
        title: title,
        program_phase: 'General Training',
        blocks: workoutBlocks,
        total_time_minutes: duration,
        training_goals: [client.goals || `${focus || 'General'} training`],
        constraints: (client.injuries && client.injuries !== 'none' && client.injuries !== 'No injuries reported') ? [client.injuries] : [],
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
      provider: aiClient && aiClient.getProvider ? aiClient.getProvider() : 'unknown'
    })
  } catch (error: any) {
    console.error('Workout generation error:', error.message)
    console.error('Stack:', error.stack)
    
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