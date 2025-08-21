import { createServiceClient } from '@/lib/db/server'
import { AIClient } from './provider'
import type { ClientContext } from './schema'

export async function getClientContext(clientId: string): Promise<ClientContext> {
  const supabase = await createServiceClient()
  
  // Fetch client details
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  
  if (clientError || !client) {
    throw new Error('Client not found')
  }

  // Fetch recent workouts
  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent feedback
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch model preferences
  const { data: preferences } = await supabase
    .from('model_preferences')
    .select('preferences')
    .eq('client_id', clientId)
    .single()

  // Fetch recent messages (this would typically use vector search)
  const { data: messages } = await supabase
    .from('messages')
    .select('content, role')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    client_id: clientId,
    full_name: client.full_name,
    age: client.age,
    sex: client.sex,
    height_cm: client.height_cm,
    weight_kg: client.weight_kg,
    goals: client.goals,
    injuries: client.injuries,
    equipment: client.equipment || [],
    preferences: preferences?.preferences || {},
    recent_workouts: workouts || [],
    recent_feedback: feedback || [],
    messages: messages?.map(m => ({
      ...m,
      similarity: 1.0, // Placeholder for vector similarity
    })) || [],
  }
}

export async function searchSimilarMessages(
  clientId: string,
  query: string,
  limit: number = 10
): Promise<Array<{ content: string; role: string; similarity: number }>> {
  const supabase = await createServiceClient()
  const aiClient = new AIClient()
  
  // Generate embedding for the query
  const queryEmbedding = await aiClient.generateEmbedding(query)
  
  // Use the vector similarity search function
  const { data, error } = await supabase.rpc('search_messages', {
    p_client_id: clientId,
    p_query_embedding: queryEmbedding,
    p_match_count: limit,
    p_similarity_threshold: 0.78,
  })
  
  if (error) {
    console.error('Vector search error:', error)
    // Fallback to regular message fetch
    const { data: messages } = await supabase
      .from('messages')
      .select('content, role')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return messages?.map(m => ({
      ...m,
      similarity: 0.5,
    })) || []
  }
  
  return data || []
}

export async function embedMessage(messageId: string, content: string): Promise<void> {
  const supabase = await createServiceClient()
  const aiClient = new AIClient()
  
  try {
    const embedding = await aiClient.generateEmbedding(content)
    
    await supabase
      .from('message_embeddings')
      .upsert({
        message_id: messageId,
        embedding,
      })
  } catch (error) {
    console.error('Failed to embed message:', error)
  }
}