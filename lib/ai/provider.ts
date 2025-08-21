import { Anthropic } from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export type AIProvider = 'anthropic' | 'openai'

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
  private provider: AIProvider

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      this.provider = 'anthropic'
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      this.provider = 'openai'
    } else {
      throw new Error('No AI provider API key found')
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

    throw new Error('No AI provider configured')
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