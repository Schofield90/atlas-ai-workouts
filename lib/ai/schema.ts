import { z } from 'zod'

export const WorkoutExerciseSchema = z.object({
  exercise_id: z.string().uuid().optional(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.union([z.string(), z.number()]).optional(),
  time_seconds: z.number().int().positive().optional(),
  tempo: z.string().optional(),
  rest_seconds: z.number().int().positive().optional(),
  load: z.string().optional(),
  notes: z.array(z.string()).optional(),
  substitutions: z.array(z.string()).optional(),
})

export const WorkoutBlockSchema = z.object({
  title: z.string(),
  exercises: z.array(WorkoutExerciseSchema),
})

export const WorkoutPlanSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string(),
  program_phase: z.string().optional(),
  blocks: z.array(WorkoutBlockSchema),
  total_time_minutes: z.number().int().positive(),
  training_goals: z.array(z.string()),
  constraints: z.array(z.string()),
  intensity_target: z.string().optional(),
  version: z.number().int().positive().default(1),
})

export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>
export type WorkoutBlock = z.infer<typeof WorkoutBlockSchema>
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>

export const ClientContextSchema = z.object({
  client_id: z.string().uuid(),
  full_name: z.string(),
  age: z.number().int().positive().optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  height_cm: z.number().positive().optional(),
  weight_kg: z.number().positive().optional(),
  goals: z.string().optional(),
  injuries: z.string().optional(),
  equipment: z.array(z.string()),
  preferences: z.record(z.any()),
  recent_workouts: z.array(z.any()),
  recent_feedback: z.array(z.any()),
  messages: z.array(z.object({
    content: z.string(),
    role: z.string(),
    similarity: z.number(),
  })),
})

export type ClientContext = z.infer<typeof ClientContextSchema>