export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string | null
          role: 'owner' | 'coach' | 'staff'
          full_name: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          role?: 'owner' | 'coach' | 'staff'
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: 'owner' | 'coach' | 'staff'
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          email: string | null
          age: number | null
          sex: 'male' | 'female' | 'other' | null
          height_cm: number | null
          weight_kg: number | null
          goals: string | null
          injuries: string | null
          equipment: Json
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          full_name: string
          email?: string | null
          age?: number | null
          sex?: 'male' | 'female' | 'other' | null
          height_cm?: number | null
          weight_kg?: number | null
          goals?: string | null
          injuries?: string | null
          equipment?: Json
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          full_name?: string
          email?: string | null
          age?: number | null
          sex?: 'male' | 'female' | 'other' | null
          height_cm?: number | null
          weight_kg?: number | null
          goals?: string | null
          injuries?: string | null
          equipment?: Json
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          client_id: string | null
          author_user_id: string | null
          role: 'client' | 'coach' | 'system'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          author_user_id?: string | null
          role?: 'client' | 'coach' | 'system'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          author_user_id?: string | null
          role?: 'client' | 'coach' | 'system'
          content?: string
          created_at?: string
        }
      }
      message_embeddings: {
        Row: {
          message_id: string
          embedding: number[]
          created_at: string
        }
        Insert: {
          message_id: string
          embedding: number[]
          created_at?: string
        }
        Update: {
          message_id?: string
          embedding?: number[]
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          modality: string | null
          body_part: string[] | null
          equipment: string[] | null
          level: 'beginner' | 'intermediate' | 'advanced' | null
          canonical_cues: string[] | null
          video_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          modality?: string | null
          body_part?: string[] | null
          equipment?: string[] | null
          level?: 'beginner' | 'intermediate' | 'advanced' | null
          canonical_cues?: string[] | null
          video_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          modality?: string | null
          body_part?: string[] | null
          equipment?: string[] | null
          level?: 'beginner' | 'intermediate' | 'advanced' | null
          canonical_cues?: string[] | null
          video_url?: string | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          client_id: string | null
          title: string
          program_phase: string | null
          plan: Json
          source: 'ai' | 'manual' | 'ai_edited' | null
          version: number
          parent_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          title: string
          program_phase?: string | null
          plan: Json
          source?: 'ai' | 'manual' | 'ai_edited' | null
          version?: number
          parent_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          title?: string
          program_phase?: string | null
          plan?: Json
          source?: 'ai' | 'manual' | 'ai_edited' | null
          version?: number
          parent_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          workout_id: string | null
          client_id: string | null
          rating: number | null
          intensity_rating: number | null
          volume_rating: number | null
          duration_minutes: number | null
          completed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id?: string | null
          client_id?: string | null
          rating?: number | null
          intensity_rating?: number | null
          volume_rating?: number | null
          duration_minutes?: number | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string | null
          client_id?: string | null
          rating?: number | null
          intensity_rating?: number | null
          volume_rating?: number | null
          duration_minutes?: number | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      model_preferences: {
        Row: {
          id: string
          client_id: string | null
          organization_id: string | null
          preferences: Json
          learned_patterns: Json
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          organization_id?: string | null
          preferences?: Json
          learned_patterns?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          organization_id?: string | null
          preferences?: Json
          learned_patterns?: Json
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_messages: {
        Args: {
          p_client_id: string
          p_query_embedding: number[]
          p_match_count?: number
          p_similarity_threshold?: number
        }
        Returns: {
          message_id: string
          content: string
          role: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}