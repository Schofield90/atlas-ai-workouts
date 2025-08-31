import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  const hasKey = !!process.env.OPENAI_API_KEY
  const keyLength = process.env.OPENAI_API_KEY?.length || 0
  
  if (!hasKey) {
    return NextResponse.json({
      error: 'No OpenAI API key found',
      hasKey: false,
      keyLength: 0
    })
  }
  
  try {
    console.log('Testing OpenAI connection...')
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // Try a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a fitness coach.' },
        { role: 'user', content: 'Name one bicep exercise in 3 words or less.' }
      ],
      max_tokens: 10,
      temperature: 0.5
    })
    
    return NextResponse.json({
      success: true,
      hasKey: true,
      keyLength: keyLength,
      testResponse: response.choices[0]?.message?.content || 'No response',
      model: response.model,
      usage: response.usage
    })
  } catch (error: any) {
    console.error('OpenAI test failed:', error)
    return NextResponse.json({
      error: 'OpenAI API test failed',
      hasKey: true,
      keyLength: keyLength,
      errorMessage: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      errorType: error.type,
      fullError: JSON.stringify(error, null, 2)
    }, { status: 500 })
  }
}