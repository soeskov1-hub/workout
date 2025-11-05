export type Database = {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      template_exercises: {
        Row: {
          id: string
          template_id: string
          name: string
          default_sets: number | null
          default_reps: number | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          default_sets?: number | null
          default_reps?: number | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          default_sets?: number | null
          default_reps?: number | null
          order_index?: number | null
          created_at?: string
        }
      }
      workouts: {
        Row: {
          id: string
          date: string
          template_id: string | null
          name_override: string | null
          notes: string | null
          completed: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          template_id?: string | null
          name_override?: string | null
          notes?: string | null
          completed?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          template_id?: string | null
          name_override?: string | null
          notes?: string | null
          completed?: boolean | null
          created_at?: string
        }
      }
      exercises: {
        Row: {
          id: string
          workout_id: string
          name: string
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          name: string
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          name?: string
          order_index?: number | null
          created_at?: string
        }
      }
      sets: {
        Row: {
          id: string
          exercise_id: string
          set_index: number
          reps: number | null
          weight_kg: number | null
          rpe: number | null
          completed: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          exercise_id: string
          set_index: number
          reps?: number | null
          weight_kg?: number | null
          rpe?: number | null
          completed?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          exercise_id?: string
          set_index?: number
          reps?: number | null
          weight_kg?: number | null
          rpe?: number | null
          completed?: boolean | null
          created_at?: string
        }
      }
    }
  }
}

export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateExercise = Database['public']['Tables']['template_exercises']['Row']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type Set = Database['public']['Tables']['sets']['Row']

export type TemplateWithExercises = Template & {
  template_exercises: TemplateExercise[]
}

export type ExerciseWithSets = Exercise & {
  sets: Set[]
}

export type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithSets[]
}
