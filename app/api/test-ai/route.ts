import { NextRequest, NextResponse } from 'next/server'
import { AIClient } from '@/lib/ai/provider'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-test-key-123'
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-test-key'
    
    const debug = {
      hasOpenAI,
      hasAnthropic,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'NOT_SET',
      anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'NOT_SET',
      defaultProvider: process.env.AI_PROVIDER || 'auto'
    }

    // Test the AI with a simple prompt
    let testResult = null
    let error = null
    
    try {
      const aiClient = new AIClient('openai') // Force OpenAI for testing
      const response = await aiClient.generateText(
        'You are a fitness coach. Generate exercises only.',
        'Generate exactly 3 bicep exercises with sets and reps. Return as JSON array like: [{"name": "...", "sets": 3, "reps": "10-12"}]',
        { temperature: 0.5, jsonMode: true }
      )
      
      testResult = {
        success: true,
        provider: (aiClient as any).provider || 'unknown',
        responseLength: response.content?.length || 0,
        response: response.content?.substring(0, 500),
        parsed: null as any
      }
      
      try {
        testResult.parsed = JSON.parse(response.content || '[]')
      } catch (e) {
        testResult.parsed = { error: 'Failed to parse JSON' }
      }
    } catch (e: any) {
      error = {
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 3).join('\n')
      }
    }

    return NextResponse.json({
      status: 'AI Test Endpoint',
      environment: debug,
      test: testResult,
      error,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 })
  }
}