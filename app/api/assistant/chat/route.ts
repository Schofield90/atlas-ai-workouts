import { NextRequest, NextResponse } from 'next/server'
import { AIClient } from '@/lib/ai/provider'

const ASSISTANT_SYSTEM_PROMPT = `You are a helpful AI fitness assistant integrated into a workout generation platform. Your role is to:

1. Help users create effective workouts
2. Explain features of the platform
3. Provide training advice and tips
4. Answer questions about exercises and fitness
5. Guide users through the app features

Platform features you can help with:
- Creating AI-generated workouts (use the "Create Workout" button or /builder page)
- Managing clients (add clients with goals, injuries, equipment preferences)
- Adding context (upload training documents, equipment lists, philosophy)
- Viewing and editing generated workouts
- Providing feedback on workouts

Be concise, friendly, and helpful. Focus on fitness and the platform features.`

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build conversation context
    let conversationContext = ''
    if (history && history.length > 0) {
      conversationContext = history.map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n') + '\n\n'
    }

    const fullPrompt = `${conversationContext}User: ${message}\n\nProvide a helpful response about fitness or the workout platform features.`

    // Generate response using AI
    const aiClient = new AIClient()
    const response = await aiClient.generateText(
      ASSISTANT_SYSTEM_PROMPT,
      fullPrompt,
      { 
        temperature: 0.7,
        maxTokens: 500
      }
    )

    return NextResponse.json({
      response: response.content,
      success: true
    })

  } catch (error) {
    console.error('Assistant chat error:', error)
    
    // Return helpful fallback responses
    const fallbackResponses = [
      "I can help you create personalized workouts! Click the 'Create Workout' button to get started, or ask me about adding clients and context for better results.",
      "To get the best workouts, try adding context about your training philosophy and available equipment. Go to 'Manage Context' from the dashboard.",
      "You can create workouts for specific clients by first adding them with their goals and limitations. Then select them when building a workout.",
      "This platform uses AI to generate personalized workouts based on client needs, available equipment, and your training context."
    ]
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    
    return NextResponse.json({
      response: randomResponse,
      success: true
    })
  }
}