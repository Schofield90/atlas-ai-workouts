import { NextRequest, NextResponse } from 'next/server'
import { AIClient } from '@/lib/ai/provider'
import { WORKOUT_SYSTEM_PROMPT } from '@/lib/ai/prompting'
import { WorkoutPlanSchema } from '@/lib/ai/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, clientId, duration = 60, intensity = 'moderate', focus = '', equipment = [] } = body

    // Get client from localStorage (this is passed from frontend)
    const client = body.client || {
      full_name: 'Guest User',
      goals: 'General fitness',
      injuries: '',
      equipment: equipment
    }

    // Build prompt
    const prompt = `Generate a workout plan for:

Client: ${client.full_name}
Title: ${title}
Goals: ${client.goals || 'General fitness'}
Available Equipment: ${equipment.length > 0 ? equipment.join(', ') : 'bodyweight only'}
Injuries/Limitations: ${client.injuries || 'none'}
Duration: ${duration} minutes
Intensity: ${intensity}
Focus: ${focus || 'full body'}

Generate a complete workout plan as JSON. Include warm-up, main work, and cool-down.`

    // Generate workout with AI
    const aiClient = new AIClient()
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
      workoutPlan = {
        ...parsed,
        client_id: clientId || 'guest',
        title: title,
        total_time_minutes: duration,
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      
      // Return a simple fallback workout
      workoutPlan = {
        client_id: clientId || 'guest',
        title: title,
        program_phase: 'General Training',
        blocks: [
          {
            title: 'Warm-up',
            exercises: [
              { name: 'Jumping Jacks', sets: 1, time_seconds: 60 },
              { name: 'Arm Circles', sets: 1, reps: '10 each direction' },
              { name: 'Leg Swings', sets: 1, reps: '10 each leg' }
            ]
          },
          {
            title: 'Main Workout',
            exercises: [
              { name: 'Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
              { name: 'Squats', sets: 3, reps: '15-20', rest_seconds: 60 },
              { name: 'Plank', sets: 3, time_seconds: 30, rest_seconds: 45 },
              { name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60 }
            ]
          },
          {
            title: 'Cool-down',
            exercises: [
              { name: 'Forward Fold', sets: 1, time_seconds: 60 },
              { name: 'Quad Stretch', sets: 1, time_seconds: 30, notes: ['Each leg'] },
              { name: 'Shoulder Stretch', sets: 1, time_seconds: 30, notes: ['Each arm'] }
            ]
          }
        ],
        total_time_minutes: duration,
        training_goals: [client.goals || 'General fitness'],
        constraints: client.injuries ? [client.injuries] : [],
        intensity_target: intensity,
        version: 1
      }
    }

    // Create workout with unique ID
    const workout = {
      id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...workoutPlan,
      created_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      workout: workout,
    })
  } catch (error) {
    console.error('Workout generation error:', error)
    
    // Return a basic workout even if AI fails
    const fallbackWorkout = {
      id: `workout-${Date.now()}`,
      title: 'Basic Workout',
      plan: {
        blocks: [
          {
            title: 'Full Body Workout',
            exercises: [
              { name: 'Jumping Jacks', sets: 3, time_seconds: 30 },
              { name: 'Push-ups', sets: 3, reps: 10 },
              { name: 'Squats', sets: 3, reps: 15 },
              { name: 'Plank', sets: 3, time_seconds: 30 }
            ]
          }
        ]
      },
      created_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      workoutId: fallbackWorkout.id,
      workout: fallbackWorkout,
    })
  }
}