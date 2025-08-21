import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { AIClient } from '@/lib/ai/provider'
import { FEEDBACK_LEARNING_PROMPT } from '@/lib/ai/prompting'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, workoutId, rating, intensityRating, volumeRating, notes } = body

    // Analyze feedback to extract preferences
    const aiClient = new AIClient()
    const feedbackAnalysis = await aiClient.generateText(
      FEEDBACK_LEARNING_PROMPT,
      JSON.stringify({
        rating,
        intensityRating,
        volumeRating,
        notes,
        context: {
          ratingScale: '1-5 (1=poor, 5=excellent)',
          intensityScale: '1-10 (1=too easy, 10=too hard)',
          volumeScale: '1-10 (1=too little, 10=too much)',
        }
      }),
      { temperature: 0.3, jsonMode: true }
    )

    let preferences = {}
    try {
      preferences = JSON.parse(feedbackAnalysis.content)
    } catch (e) {
      console.error('Failed to parse AI feedback analysis:', e)
      // Fallback to simple preference extraction
      preferences = {
        preferences: {
          liked: rating >= 4 ? ['current format'] : [],
          disliked: rating <= 2 ? ['current format'] : [],
          intensity_preference: intensityRating < 4 ? 'higher' : intensityRating > 6 ? 'lower' : 'same',
          volume_preference: volumeRating < 4 ? 'more' : volumeRating > 6 ? 'less' : 'same',
        },
        patterns: [],
        recommendations: []
      }
    }

    // Get existing preferences
    const { data: existingPrefs } = await supabase
      .from('model_preferences')
      .select('*')
      .eq('client_id', clientId)
      .single()

    // Merge preferences
    const updatedPreferences = existingPrefs ? {
      ...existingPrefs.preferences,
      ...preferences.preferences,
      feedback_history: [
        ...(existingPrefs.preferences.feedback_history || []),
        {
          workout_id: workoutId,
          rating,
          intensity: intensityRating,
          volume: volumeRating,
          timestamp: new Date().toISOString()
        }
      ].slice(-10) // Keep last 10 feedback entries
    } : {
      ...preferences.preferences,
      feedback_history: [{
        workout_id: workoutId,
        rating,
        intensity: intensityRating,
        volume: volumeRating,
        timestamp: new Date().toISOString()
      }]
    }

    // Update patterns
    const patterns = [
      ...(existingPrefs?.learned_patterns || []),
      ...(preferences.patterns || [])
    ]

    // Upsert preferences
    const { error: prefError } = await supabase
      .from('model_preferences')
      .upsert({
        client_id: clientId,
        organization_id: null, // Will be set by RLS
        preferences: updatedPreferences,
        learned_patterns: patterns,
      })

    if (prefError) {
      console.error('Failed to update preferences:', prefError)
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
      recommendations: preferences.recommendations
    })
  } catch (error) {
    console.error('Feedback learning error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
}