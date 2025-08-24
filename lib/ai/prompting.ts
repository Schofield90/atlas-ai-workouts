import { ClientContext, WorkoutPlan } from './schema'

export const WORKOUT_SYSTEM_PROMPT = `You are a professional fitness coach creating personalized workout plans. Generate safe, effective, time-bound training programs.

Core Principles:
- Always include warm-up, main work, and cool-down phases
- Respect injuries and equipment limitations
- Consider client preferences and past feedback
- Use clear, actionable cues
- Provide exercise substitutions for accessibility
- Focus on progressive overload and proper form

Output Requirements:
- Generate ONLY valid JSON matching the WorkoutPlan schema
- No explanations or additional text
- Keep total time within the specified budget
- Prioritize compound movements when appropriate
- Balance muscle groups and movement patterns

Workout Structure:
1. Warm-up (5-10 minutes): Dynamic stretches, mobility, activation
2. Main Work: Strength, conditioning, or hybrid based on goals
3. Cool-down (5-10 minutes): Static stretches, recovery

Exercise Selection:
- Match client's experience level
- Consider available equipment
- Provide 2-3 substitutions for key exercises
- Include tempo and rest periods
- Specify load as RPE, percentage, or absolute weight

Output only valid JSON matching WorkoutPlan schema.`

export function buildWorkoutPrompt(
  context: ClientContext,
  title: string,
  additionalInstructions?: string
): string {
  const equipment = context.equipment && Array.isArray(context.equipment) && context.equipment.length > 0 
    ? context.equipment.join(', ') 
    : 'bodyweight only'
  
  const injuries = context.injuries || 'none reported'
  const goals = context.goals || 'general fitness'
  
  let prompt = `Generate a workout plan for:

Client: ${context.full_name}
Title: ${title}
Goals: ${goals}
Available Equipment: ${equipment}
Injuries/Limitations: ${injuries}
`

  if (context.age) prompt += `Age: ${context.age}\n`
  if (context.sex) prompt += `Sex: ${context.sex}\n`
  if (context.height_cm && context.weight_kg) {
    prompt += `Height: ${context.height_cm}cm, Weight: ${context.weight_kg}kg\n`
  }

  if (context.recent_workouts.length > 0) {
    prompt += `\nRecent Training (for progression context):\n`
    context.recent_workouts.slice(0, 3).forEach((workout, i) => {
      prompt += `${i + 1}. ${workout.title} - ${workout.program_phase || 'general'}\n`
    })
  }

  if (context.recent_feedback.length > 0) {
    prompt += `\nRecent Feedback:\n`
    context.recent_feedback.slice(0, 3).forEach((feedback, i) => {
      prompt += `${i + 1}. Rating: ${feedback.rating}/5, Intensity: ${feedback.intensity_rating}/10`
      if (feedback.notes) prompt += ` - "${feedback.notes}"`
      prompt += `\n`
    })
  }

  if (context.messages.length > 0) {
    prompt += `\nRelevant Context from Conversations:\n`
    context.messages.slice(0, 5).forEach((msg, i) => {
      prompt += `${i + 1}. ${msg.content}\n`
    })
  }

  if (context.preferences && Object.keys(context.preferences).length > 0) {
    prompt += `\nLearned Preferences:\n`
    Object.entries(context.preferences).forEach(([key, value]) => {
      prompt += `- ${key}: ${JSON.stringify(value)}\n`
    })
  }

  if (additionalInstructions) {
    prompt += `\nAdditional Instructions:\n${additionalInstructions}\n`
  }

  prompt += `\nGenerate a complete workout plan as JSON. Target duration: 45-60 minutes unless specified otherwise.`

  return prompt
}

export const CRITIQUE_PROMPT = `Review this workout plan for:
1. Safety - Are exercises appropriate for injuries/limitations?
2. Balance - Are muscle groups and movement patterns balanced?
3. Progression - Does it build appropriately from recent workouts?
4. Time - Does it fit within the time budget?
5. Equipment - Are all exercises possible with available equipment?

If any issues found, return a JSON object with corrections. Otherwise return {"approved": true}`

export const FEEDBACK_LEARNING_PROMPT = `Analyze this workout feedback to extract preferences and patterns.

Return a JSON object with:
{
  "preferences": {
    "liked": [],
    "disliked": [],
    "intensity_preference": "lower|same|higher",
    "volume_preference": "less|same|more",
    "time_preference": "shorter|same|longer"
  },
  "patterns": [],
  "recommendations": []
}`