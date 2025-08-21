import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/db/server'
import { AIClient } from '@/lib/ai/provider'
import { getClientContext } from '@/lib/ai/rag'
import { buildWorkoutPrompt, WORKOUT_SYSTEM_PROMPT } from '@/lib/ai/prompting'
import { WorkoutPlanSchema } from '@/lib/ai/schema'
import { z } from 'zod'

const GenerateRequestSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().uuid(),
  duration: z.number().int().min(15).max(120).optional(),
  intensity: z.enum(['light', 'moderate', 'intense']).optional(),
  focus: z.string().optional(),
  equipment: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request
    const body = await request.json()
    const validatedData = GenerateRequestSchema.parse(body)

    // Check client access
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validatedData.clientId)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get client context
    const serviceSupabase = await createServiceClient()
    const context = await getClientContext(validatedData.clientId)

    // Override equipment if provided
    if (validatedData.equipment) {
      context.equipment = validatedData.equipment
    }

    // Build additional instructions
    let additionalInstructions = ''
    if (validatedData.duration) {
      additionalInstructions += `Target duration: ${validatedData.duration} minutes\n`
    }
    if (validatedData.intensity) {
      additionalInstructions += `Intensity level: ${validatedData.intensity}\n`
    }
    if (validatedData.focus) {
      additionalInstructions += `Focus area: ${validatedData.focus}\n`
    }

    // Generate workout with AI
    const aiClient = new AIClient()
    const prompt = buildWorkoutPrompt(context, validatedData.title, additionalInstructions)
    
    const response = await aiClient.generateText(
      WORKOUT_SYSTEM_PROMPT,
      prompt,
      { 
        temperature: 0.7,
        jsonMode: true 
      }
    )

    // Parse and validate the generated workout
    let workoutPlan
    try {
      const parsed = JSON.parse(response.content)
      workoutPlan = WorkoutPlanSchema.parse({
        ...parsed,
        client_id: validatedData.clientId,
        title: validatedData.title,
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json(
        { error: 'Failed to generate valid workout plan' },
        { status: 500 }
      )
    }

    // Get user data for created_by
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // Save workout to database
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        client_id: workoutPlan.client_id,
        title: workoutPlan.title,
        program_phase: workoutPlan.program_phase,
        plan: workoutPlan,
        source: 'ai',
        version: 1,
        created_by: userData?.id || user.id,
      })
      .select()
      .single()

    if (workoutError) {
      console.error('Failed to save workout:', workoutError)
      return NextResponse.json(
        { error: 'Failed to save workout' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      workout: workout,
    })
  } catch (error) {
    console.error('Workout generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 }
    )
  }
}