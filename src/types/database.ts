export type Database = {
  public: {
    Tables: {
      exercise_catalog: {
        Row: {
          id: string
          name: string
          category: string | null
          is_compound: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          is_compound?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          is_compound?: boolean | null
          created_at?: string | null
        }
      }
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
          name: string | null
          exercise_catalog_id: string | null
          default_sets: number | null
          default_reps: number | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name?: string | null
          exercise_catalog_id?: string | null
          default_sets?: number | null
          default_reps?: number | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string | null
          exercise_catalog_id?: string | null
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
          name: string | null
          exercise_catalog_id: string | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          name?: string | null
          exercise_catalog_id?: string | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          name?: string | null
          exercise_catalog_id?: string | null
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
      one_rep_maxes: {
        Row: {
          id: string
          exercise_name: string | null
          exercise_catalog_id: string | null
          one_rm: number
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          exercise_name?: string | null
          exercise_catalog_id?: string | null
          one_rm: number
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          exercise_name?: string | null
          exercise_catalog_id?: string | null
          one_rm?: number
          date?: string
          created_at?: string
        }
      }
      tracking_periods: {
        Row: {
          id: string
          start_date: string
          end_date: string | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          start_date: string
          end_date?: string | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean | null
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
export type OneRepMax = Database['public']['Tables']['one_rep_maxes']['Row']
export type ExerciseCatalog = Database['public']['Tables']['exercise_catalog']['Row']
export type TrackingPeriod = Database['public']['Tables']['tracking_periods']['Row']

export type TemplateWithExercises = Template & {
  template_exercises: TemplateExercise[]
}

export type ExerciseWithSets = Exercise & {
  sets: Set[]
}

export type WorkoutWithExercises = Workout & {
  exercises: ExerciseWithSets[]
}
