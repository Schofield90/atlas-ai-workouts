import { Anthropic } from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export type AIProvider = 'anthropic' | 'openai' | 'fallback'

export interface AIResponse {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export class AIClient {
  private anthropic?: Anthropic
  private openai?: OpenAI
  private provider: AIProvider = 'fallback'
  private preferredProvider?: AIProvider

  private getFallbackExercisesForFocus(focus: string) {
    const focusLower = focus.toLowerCase()
    
    if (focusLower.includes('bicep') && focusLower.includes('tricep')) {
      return [
        { name: 'Diamond Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Chin-ups (underhand grip)', sets: 3, reps: '8-10', rest_seconds: 90 },
        { name: 'Tricep Dips (using chair)', sets: 3, reps: '12-15', rest_seconds: 60 },
        { name: 'Pike Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Close-Grip Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
        { name: 'Isometric Bicep Hold', sets: 3, time_seconds: 30, rest_seconds: 45 }
      ]
    } else if (focusLower.includes('bicep')) {
      return [
        { name: 'Chin-ups (underhand grip)', sets: 4, reps: '8-12', rest_seconds: 90 },
        { name: 'Isometric Bicep Hold', sets: 3, time_seconds: 30, rest_seconds: 45 },
        { name: 'Resistance Band Curls', sets: 4, reps: '15-20', rest_seconds: 45 },
        { name: 'Bodyweight Curls (table edge)', sets: 3, reps: '10-15', rest_seconds: 60 }
      ]
    } else if (focusLower.includes('tricep')) {
      return [
        { name: 'Diamond Push-ups', sets: 4, reps: '10-15', rest_seconds: 60 },
        { name: 'Tricep Dips (using chair)', sets: 4, reps: '12-15', rest_seconds: 60 },
        { name: 'Pike Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Close-Grip Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 }
      ]
    } else if (focusLower.includes('chest')) {
      return [
        { name: 'Push-ups', sets: 4, reps: '12-15', rest_seconds: 60 },
        { name: 'Wide-Grip Push-ups', sets: 3, reps: '10-12', rest_seconds: 60 },
        { name: 'Incline Push-ups', sets: 3, reps: '12-15', rest_seconds: 60 },
        { name: 'Chest Dips', sets: 3, reps: '8-12', rest_seconds: 90 }
      ]
    } else if (focusLower.includes('leg') || focusLower.includes('glute')) {
      return [
        { name: 'Squats', sets: 4, reps: '15-20', rest_seconds: 60 },
        { name: 'Lunges', sets: 3, reps: '12 each leg', rest_seconds: 60 },
        { name: 'Jump Squats', sets: 3, reps: '10-12', rest_seconds: 90 },
        { name: 'Wall Sit', sets: 3, time_seconds: 45, rest_seconds: 60 },
        { name: 'Calf Raises', sets: 3, reps: '20', rest_seconds: 45 }
      ]
    } else {
      // Full body default
      return [
        { name: 'Push-ups', sets: 3, reps: '10-15', rest_seconds: 60 },
        { name: 'Squats', sets: 3, reps: '15-20', rest_seconds: 60 },
        { name: 'Plank', sets: 3, time_seconds: 30, rest_seconds: 45 },
        { name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60 },
        { name: 'Mountain Climbers', sets: 3, time_seconds: 30, rest_seconds: 60 }
      ]
    }
  }

  constructor(preferredProvider?: AIProvider) {
    console.log('=== AI Provider Initialization ===')
    console.log('Preferred provider:', preferredProvider || process.env.AI_PROVIDER || 'auto')
    console.log('Anthropic key exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('OpenAI key exists:', !!process.env.OPENAI_API_KEY)
    console.log('OpenAI key length:', process.env.OPENAI_API_KEY?.length || 0)
    
    this.preferredProvider = preferredProvider || (process.env.AI_PROVIDER as AIProvider)
    
    // Initialize both providers if keys are available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'placeholder-openai-key') {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
        console.log('✅ OpenAI initialized successfully')
      } catch (error) {
        console.warn('❌ Failed to initialize OpenAI:', error)
      }
    } else if (process.env.OPENAI_API_KEY === 'placeholder-openai-key') {
      console.warn('⚠️ OpenAI key is a placeholder - please set a valid OPENAI_API_KEY')
    }
    
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder-anthropic-key') {
      try {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
        console.log('✅ Anthropic initialized successfully')
      } catch (error) {
        console.warn('❌ Failed to initialize Anthropic:', error)
      }
    }
    
    // Determine which provider to use based on preference and availability
    if (this.preferredProvider === 'openai' && this.openai) {
      this.provider = 'openai'
    } else if (this.preferredProvider === 'anthropic' && this.anthropic) {
      this.provider = 'anthropic'
    } else if (this.anthropic) {
      this.provider = 'anthropic'
    } else if (this.openai) {
      this.provider = 'openai'
    }
    
    // Don't throw error, allow fallback mode
    if (!this.anthropic && !this.openai) {
      console.warn('⚠️ No AI provider configured - using fallback mode')
    }
    
    console.log('Final provider:', this.provider)
  }

  getProvider(): AIProvider {
    return this.provider
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
      jsonMode?: boolean
    }
  ): Promise<AIResponse> {
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens ?? 4000

    if (this.provider === 'anthropic' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: process.env.GEN_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      }
    } else if (this.provider === 'openai' && this.openai) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
        console.log('Calling OpenAI API...')
        console.log('Model:', model)
        const response = await this.openai.chat.completions.create({
          model: model,
          temperature,
          max_tokens: maxTokens,
          response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        })
        
        console.log('OpenAI API call successful')
        return {
          content: response.choices[0].message.content || '',
          usage: {
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
          },
        }
      } catch (error: any) {
        console.error('❌ OpenAI API call failed:', error.message || error)
        console.error('Error details:', {
          status: error.status,
          code: error.code,
          type: error.type,
          message: error.message
        })
        throw error // Re-throw to trigger fallback in route
      }
    }

    // Return a fallback workout when no AI is configured
    console.error('⚠️ NO AI PROVIDER CONFIGURED - Using fallback mode')
    console.error('Please set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable')
    
    if (options?.jsonMode) {
      // Try to extract focus from the prompt if possible
      const focusMatch = userPrompt.match(/Focus:\s*([^\n]+)/i)
      const focus = focusMatch ? focusMatch[1] : 'full body'
      
      console.log('Fallback mode - attempting to generate workout for focus:', focus)
      
      // Generate exercises based on focus
      const mainExercises = this.getFallbackExercisesForFocus(focus)
      
      return {
        content: JSON.stringify({
          program_phase: "General Training",
          blocks: [
            {
              title: "Warm-up",
              exercises: [
                { name: "Arm Circles", sets: 2, reps: "10 each direction", rest_seconds: 30 },
                { name: "Wrist Rotations", sets: 2, reps: "10 each direction", rest_seconds: 30 },
                { name: "Light Cardio", sets: 1, time_seconds: 120, rest_seconds: 30 }
              ]
            },
            {
              title: `Main Workout - ${focus}`,
              exercises: mainExercises
            },
            {
              title: "Cool-down",
              exercises: [
                { name: "Arm Stretches", sets: 1, time_seconds: 30, notes: ["Each arm"] },
                { name: "Shoulder Stretches", sets: 1, time_seconds: 30, notes: ["Each side"] },
                { name: "Deep Breathing", sets: 1, time_seconds: 60 }
              ]
            }
          ],
          training_goals: [`${focus} training`, "Strength", "Muscle development"],
          constraints: [],
          intensity_target: "moderate",
          notes: "⚠️ AI NOT CONFIGURED - This is a fallback workout. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for personalized AI workouts."
        }),
        usage: { input_tokens: 0, output_tokens: 0 }
      }
    }
    
    return {
      content: 'Please configure an AI provider (OPENAI_API_KEY or ANTHROPIC_API_KEY) for workout generation.',
      usage: { input_tokens: 0, output_tokens: 0 }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.openai) {
      const response = await this.openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-large',
        input: text,
        dimensions: 3072,
      })
      return response.data[0].embedding
    }

    // Fallback to OpenAI for embeddings even if using Anthropic for generation
    if (!this.openai && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      return this.generateEmbedding(text)
    }

    throw new Error('OpenAI API key required for embeddings')
  }
}