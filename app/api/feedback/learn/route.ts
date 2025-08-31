import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workout_id, rating, feedback, category, scope, client_id } = body

    console.log('Learning from feedback:', {
      workout_id,
      rating,
      feedback: feedback?.substring(0, 100) + '...',
      category,
      scope,
      client_id
    })

    // For now, just log the feedback for learning purposes
    // In the future, this could:
    // 1. Update AI training data
    // 2. Adjust workout generation parameters
    // 3. Store preferences for future use
    // 4. Update client profiles based on feedback

    return NextResponse.json({ 
      success: true,
      message: 'Feedback processed for AI learning'
    })
  } catch (error: any) {
    console.error('Error in POST /api/feedback/learn:', error)
    return NextResponse.json({ 
      error: 'Failed to process learning feedback',
      message: error.message 
    }, { status: 500 })
  }
}