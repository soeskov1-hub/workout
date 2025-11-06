import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ExerciseCatalog } from '../types/database'

const untypedSupabase = supabase as any

interface ExerciseSelectorProps {
  value: string | null // exercise_catalog_id
  onChange: (exerciseId: string, exerciseName: string) => void
  placeholder?: string
  className?: string
  categoryFilter?: string | null
  compoundOnly?: boolean
}

export default function ExerciseSelector({
  value,
  onChange,
  placeholder = 'Vælg øvelse...',
  className = '',
  categoryFilter = null,
  compoundOnly = false
}: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<ExerciseCatalog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    try {
      let query = untypedSupabase
        .from('exercise_catalog')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (categoryFilter) {
        query = query.eq('category', categoryFilter)
      }

      if (compoundOnly) {
        query = query.eq('is_compound', true)
      }

      const { data, error } = await query

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group exercises by category
  const groupedExercises = exercises.reduce((acc, ex) => {
    const cat = ex.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {} as Record<string, ExerciseCatalog[]>)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value
    if (!selectedId) {
      return
    }
    
    const exercise = exercises.find(ex => ex.id === selectedId)
    if (exercise) {
      onChange(exercise.id, exercise.name)
    }
  }

  if (loading) {
    return (
      <select className={className} disabled>
        <option>Indlæser øvelser...</option>
      </select>
    )
  }

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      className={className}
      required
    >
      <option value="">{placeholder}</option>
      {Object.entries(groupedExercises).map(([category, exs]) => (
        <optgroup key={category} label={category}>
          {exs.map(ex => (
            <option key={ex.id} value={ex.id}>
              {ex.name} {ex.is_compound ? '(Compound)' : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
