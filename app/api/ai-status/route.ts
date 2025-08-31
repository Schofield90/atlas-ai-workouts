import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY
  
  const anthropicKeyLength = process.env.ANTHROPIC_API_KEY?.length || 0
  const openAIKeyLength = process.env.OPENAI_API_KEY?.length || 0
  
  const provider = hasAnthropicKey ? 'anthropic' : hasOpenAIKey ? 'openai' : 'fallback'
  
  return NextResponse.json({
    status: {
      provider: provider,
      hasAnthropicKey: hasAnthropicKey,
      hasOpenAIKey: hasOpenAIKey,
      anthropicKeyLength: anthropicKeyLength,
      openAIKeyLength: openAIKeyLength,
      isConfigured: hasAnthropicKey || hasOpenAIKey,
      message: provider === 'fallback' 
        ? '⚠️ NO AI CONFIGURED - Using fallback workouts. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel environment variables.'
        : `✅ AI configured with ${provider}`
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelEnv: process.env.VERCEL_ENV
    },
    recommendation: provider === 'fallback' ? {
      steps: [
        '1. Go to https://vercel.com/schofield90s-projects/atlas-ai-workouts/settings/environment-variables',
        '2. Add ANTHROPIC_API_KEY or OPENAI_API_KEY',
        '3. Redeploy the application',
        '4. Test workout generation again'
      ]
    } : null
  })
}