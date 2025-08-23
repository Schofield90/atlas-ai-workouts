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

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
        this.provider = 'anthropic'
      } catch (error) {
        console.warn('Failed to initialize Anthropic:', error)
      }
    } 
    
    if (!this.anthropic && process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
        this.provider = 'openai'
      } catch (error) {
        console.warn('Failed to initialize OpenAI:', error)
      }
    }
    
    // Don't throw error, allow fallback mode
    if (!this.anthropic && !this.openai) {
      console.warn('No AI provider configured - using fallback mode')
    }
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
      const response = await this.openai.chat.completions.create({
        model: process.env.GEN_MODEL || 'gpt-4-turbo-preview',
        temperature,
        max_tokens: maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      return {
        content: response.choices[0].message.content || '',
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
        },
      }
    }

    // Return a fallback workout when no AI is configured
    if (options?.jsonMode) {
      return {
        content: JSON.stringify({
          program_phase: "General Training",
          blocks: [
            {
              title: "Warm-up",
              exercises: [
                { name: "Arm Circles", sets: 2, reps: "10 each direction", rest_seconds: 30 },
                { name: "Leg Swings", sets: 2, reps: "10 each leg", rest_seconds: 30 },
                { name: "Jumping Jacks", sets: 2, time_seconds: 60, rest_seconds: 30 }
              ]
            },
            {
              title: "Main Workout",
              exercises: [
                { name: "Push-ups", sets: 3, reps: "10-15", rest_seconds: 60 },
                { name: "Bodyweight Squats", sets: 3, reps: "15-20", rest_seconds: 60 },
                { name: "Plank", sets: 3, time_seconds: 30, rest_seconds: 45 },
                { name: "Lunges", sets: 3, reps: "10 each leg", rest_seconds: 60 },
                { name: "Mountain Climbers", sets: 3, time_seconds: 30, rest_seconds: 60 }
              ]
            },
            {
              title: "Cool-down",
              exercises: [
                { name: "Forward Fold", sets: 1, time_seconds: 60 },
                { name: "Quad Stretch", sets: 2, time_seconds: 30, notes: ["Each leg"] },
                { name: "Shoulder Stretch", sets: 2, time_seconds: 30, notes: ["Each arm"] }
              ]
            }
          ],
          training_goals: ["General fitness", "Strength", "Endurance"],
          constraints: [],
          intensity_target: "moderate",
          notes: "This is a sample workout. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY for AI-generated personalized workouts."
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