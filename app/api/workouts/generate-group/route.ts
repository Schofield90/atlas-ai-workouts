import { NextRequest, NextResponse } from 'next/server'
import { AIClient } from '@/lib/ai/provider'
import { WORKOUT_SYSTEM_PROMPT } from '@/lib/ai/prompting'

interface ClientInfo {
  id: string
  full_name: string
  goals?: string
  injuries?: string
  equipment?: string[]
}

interface GroupWorkoutRequest {
  clients: ClientInfo[]
  duration: number
  intensity: string
  focus: string
  gymEquipment: string[]
  context?: any
  title?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GroupWorkoutRequest = await request.json()
    const { clients, duration = 60, intensity = 'moderate', focus = 'full body', gymEquipment = [], context, title } = body

    console.log('=== GROUP WORKOUT GENERATION ===')
    console.log('Clients:', clients.length)
    console.log('Gym equipment input:', gymEquipment)

    // Extract equipment from context if available
    let contextEquipment: string[] = []
    if (context && context.textSections && context.textSections.length > 0) {
      const equipmentSections = context.textSections.filter((section: any) => 
        section.category === 'equipment'
      )
      
      equipmentSections.forEach((section: any) => {
        // Extract equipment from equipment SOPs
        const equipmentText = section.content.toLowerCase()
        const commonEquipment = [
          'dumbbells', 'dumbbell', 'barbell', 'barbells', 'kettlebell', 'kettlebells',
          'resistance bands', 'bands', 'pull-up bar', 'chin-up bar', 'pull up bar',
          'squat rack', 'power rack', 'bench', 'flat bench', 'incline bench',
          'cable machine', 'cables', 'lat pulldown', 'rowing machine', 'rower',
          'treadmill', 'bike', 'stationary bike', 'elliptical', 'smith machine',
          'leg press', 'leg curl', 'leg extension', 'calf raise', 'dip bars',
          'battle ropes', 'medicine ball', 'stability ball', 'bosu ball',
          'foam roller', 'yoga mats', 'mats', 'plates', 'weight plates'
        ]
        
        commonEquipment.forEach(equipment => {
          if (equipmentText.includes(equipment) && !contextEquipment.includes(equipment)) {
            contextEquipment.push(equipment)
          }
        })
      })
    }

    // Combine manual gym equipment with context equipment
    const allEquipment = [...new Set([...gymEquipment, ...contextEquipment])]
    console.log('Context equipment found:', contextEquipment)
    console.log('Combined equipment list:', allEquipment)

    // Build comprehensive prompt for group workout
    let prompt = ''
    
    // Add context if provided
    if (context) {
      prompt += `CONTEXT AND BACKGROUND:\n`
      
      if (context.textSections && context.textSections.length > 0) {
        prompt += `KNOWLEDGE BASE:\n`
        context.textSections.forEach((section: any) => {
          const categoryLabels: Record<string, string> = {
            'sop': 'SOP',
            'chat': 'Chat Export', 
            'guide': 'Training Guide',
            'notes': 'Notes',
            'equipment': 'Equipment & Facility Information'
          }
          const categoryLabel = categoryLabels[section.category] || 'Context'
          
          prompt += `\n[${categoryLabel}: ${section.title}]\n`
          prompt += `${section.content.substring(0, 8000)}\n`
        })
        prompt += `\n`
      }
      
      prompt += `---\n\n`
    }

    // Add group workout specific instructions
    prompt += `Generate a GROUP WORKOUT for ${clients.length} clients training together simultaneously.

GROUP MEMBERS:
${clients.map((client, index) => `${index + 1}. ${client.full_name}
   - Goals: ${client.goals || 'General fitness'}
   - Injuries/Limitations: ${client.injuries || 'None'}
   - Individual Equipment: ${client.equipment?.join(', ') || 'None'}`).join('\n')}

WORKOUT SPECIFICATIONS:
- Duration: ${duration} minutes
- Intensity: ${intensity}
- Focus: ${focus}
- Available Gym Equipment: ${allEquipment.length > 0 ? allEquipment.join(', ') : 'bodyweight only'}
${contextEquipment.length > 0 ? `- Equipment from SOPs: ${contextEquipment.join(', ')}` : ''}

CRITICAL GROUP WORKOUT REQUIREMENTS:

1. **EQUIPMENT MANAGEMENT**: 
   - Ensure NO equipment conflicts - each piece of equipment can only be used by one person at a time
   - If multiple people need the same equipment, create stations or alternating sets
   - Use different equipment variations for similar muscle groups

2. **GROUP STRUCTURE**: 
   - All clients must be able to train together without equipment conflicts
   - Create 2 SHARED rehab exercises for the entire group:
     * 1 upper body rehab exercise (everyone does the same)
     * 1 lower body rehab exercise (everyone does the same)

3. **WORKOUT PROGRESSION** (for each individual client):
   - START: 2 compound exercises
   - MIDDLE: 2 more compound exercises incorporating other muscle groups  
   - END: Isolation movements
   - Include the 2 shared rehab exercises at appropriate points

4. **SAFETY & MODIFICATIONS**:
   - Respect each client's injuries and limitations
   - Provide exercise modifications where needed
   - Ensure proper spacing and safety for group training

5. **EQUIPMENT ALLOCATION**:
   - Clearly specify which client uses which equipment
   - If equipment sharing is needed, specify rotation order
   - Ensure efficient equipment transitions

Generate the workout as JSON with this structure:
{
  "group_title": "${title || 'Group Training Session'}",
  "duration_minutes": ${duration},
  "shared_rehab_exercises": [
    {
      "name": "Upper Body Rehab Exercise",
      "type": "upper_rehab",
      "sets": 2,
      "reps": "15-20",
      "rest_seconds": 45,
      "instruction": "Everyone performs this together"
    },
    {
      "name": "Lower Body Rehab Exercise", 
      "type": "lower_rehab",
      "sets": 2,
      "reps": "15-20",
      "rest_seconds": 45,
      "instruction": "Everyone performs this together"
    }
  ],
  "individual_workouts": [
    ${clients.map((client, index) => `{
      "client_id": "${client.id}",
      "client_name": "${client.full_name}",
      "blocks": [
        {
          "title": "Training Session",
          "exercises": [
            // 2 compound exercises to start
            // 2 more compound exercises
            // Isolation movements
            // Include shared rehab exercises at appropriate points
          ]
        }
      ],
      "equipment_assigned": ["specific equipment for this client"],
      "training_goals": ["${client.goals || 'General fitness'}"],
      "constraints": [${client.injuries && client.injuries !== 'None' ? `"${client.injuries}"` : ''}]
    }`).join(',\n    ')}
  ],
  "equipment_schedule": {
    // Show which equipment is used when and by whom to avoid conflicts
  },
  "group_notes": "Training notes for the entire group session"
}

REMEMBER:
- Each client gets personalized exercises but no equipment conflicts
- Everyone does the same 2 rehab exercises
- Structure: Compound → Compound → Isolation for each person
- Account for all injuries and limitations
- Efficient equipment usage and transitions`

    // Generate workout with AI
    const aiClient = new AIClient()
    const response = await aiClient.generateText(
      WORKOUT_SYSTEM_PROMPT,
      prompt,
      { 
        temperature: 0.7,
        jsonMode: true,
        maxTokens: 6000
      }
    )

    // Parse the response
    let groupWorkout
    try {
      let jsonContent = response.content || '{}'
      
      // Clean up the response
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonContent = jsonMatch[0]
      }
      
      groupWorkout = JSON.parse(jsonContent)
      
      // Validate structure
      if (!groupWorkout.individual_workouts || !Array.isArray(groupWorkout.individual_workouts)) {
        throw new Error('Invalid group workout structure')
      }
      
    } catch (parseError) {
      console.error('Failed to parse group workout response:', parseError)
      
      // Fallback: create individual workouts for each client
      groupWorkout = {
        group_title: title || 'Group Training Session',
        duration_minutes: duration,
        shared_rehab_exercises: [
          {
            name: 'Band Pull-Aparts',
            type: 'upper_rehab',
            sets: 2,
            reps: '15-20',
            rest_seconds: 45,
            instruction: 'Everyone performs this together'
          },
          {
            name: 'Bodyweight Squats',
            type: 'lower_rehab', 
            sets: 2,
            reps: '15-20',
            rest_seconds: 45,
            instruction: 'Everyone performs this together'
          }
        ],
        individual_workouts: clients.map((client, index) => ({
          client_id: client.id,
          client_name: client.full_name,
          blocks: [{
            title: 'Training Session',
            exercises: [
              // Compound exercises first
              { name: 'Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
              { name: 'Bodyweight Squats', sets: 3, reps: '15-20', rest_seconds: 60 },
              { name: 'Pike Push-ups', sets: 3, reps: '8-12', rest_seconds: 60 },
              { name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60 },
              // Isolation movements
              { name: 'Plank', sets: 3, time_seconds: 30, rest_seconds: 45 }
            ]
          }],
          equipment_assigned: [],
          training_goals: [client.goals || 'General fitness'],
          constraints: client.injuries && client.injuries !== 'None' ? [client.injuries] : []
        })),
        equipment_schedule: {},
        group_notes: 'Fallback group workout - AI generation failed'
      }
    }

    return NextResponse.json({
      success: true,
      groupWorkout,
      provider: aiClient.getProvider()
    })

  } catch (error: any) {
    console.error('Group workout generation error:', error.message)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate group workout'
    }, { status: 500 })
  }
}