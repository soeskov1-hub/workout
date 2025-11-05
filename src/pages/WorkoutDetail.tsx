import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WorkoutWithExercises, ExerciseWithSets, Set } from '../types/database'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface WeightSuggestion {
  exerciseName: string
  lastUsed: number | null
  bestSet: number | null
  estimated1RM: number | null
  suggested: number | null
}

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<Map<string, WeightSuggestion>>(new Map())

  useEffect(() => {
    if (id) {
      loadWorkout()
    }
  }, [id])

  const loadWorkout = async () => {
    try {
      setLoading(true)

      // Load workout with exercises and sets
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          exercises (
            *,
            sets (*)
          )
        `)
        .eq('id', id)
        .single()

      if (workoutError) throw workoutError

      // Sort exercises and sets
      const sortedWorkout: WorkoutWithExercises = {
        ...workoutData,
        exercises: workoutData.exercises
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map(ex => ({
            ...ex,
            sets: ex.sets.sort((a, b) => a.set_index - b.set_index)
          }))
      }

      setWorkout(sortedWorkout)

      // Load weight suggestions for each exercise
      await loadWeightSuggestions(sortedWorkout.exercises)
    } catch (error) {
      console.error('Error loading workout:', error)
      toast.error('Kunne ikke indlæse workout')
    } finally {
      setLoading(false)
    }
  }

  const loadWeightSuggestions = async (exercises: ExerciseWithSets[]) => {
    const newSuggestions = new Map<string, WeightSuggestion>()

    for (const exercise of exercises) {
      // Get historical data for this exercise
      const { data: historicalSets, error } = await supabase
        .from('sets')
        .select(`
          *,
          exercises!inner (
            name,
            workouts!inner (
              date
            )
          )
        `)
        .eq('exercises.name', exercise.name)
        .not('weight_kg', 'is', null)
        .not('reps', 'is', null)
        .eq('completed', true)
        .order('exercises.workouts.date', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error loading history:', error)
        continue
      }

      let lastUsed: number | null = null
      let bestSet: number | null = null
      let estimated1RM: number | null = null

      if (historicalSets && historicalSets.length > 0) {
        // Last used weight
        lastUsed = historicalSets[0].weight_kg

        // Best set by weight
        bestSet = Math.max(...historicalSets.map(s => s.weight_kg || 0))

        // Estimate 1RM using Brzycki formula: weight / (1.0278 - 0.0278 * reps)
        const estimatedMax = Math.max(
          ...historicalSets.map(s => {
            if (s.weight_kg && s.reps) {
              return s.weight_kg / (1.0278 - 0.0278 * s.reps)
            }
            return 0
          })
        )
        estimated1RM = Math.round(estimatedMax * 10) / 10

        // Suggest weight: last used + 2.5kg for progression, or last used if first time
        const suggested = lastUsed ? Math.round((lastUsed + 2.5) * 2) / 2 : null
        
        newSuggestions.set(exercise.id, {
          exerciseName: exercise.name,
          lastUsed,
          bestSet,
          estimated1RM,
          suggested
        })
      }
    }

    setSuggestions(newSuggestions)
  }

  const updateSet = async (setId: string, field: keyof Set, value: number | boolean | null) => {
    try {
      const { error } = await supabase
        .from('sets')
        .update({ [field]: value })
        .eq('id', setId)

      if (error) throw error

      // Update local state
      if (workout) {
        const updated = { ...workout }
        updated.exercises = updated.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.map(set =>
            set.id === setId ? { ...set, [field]: value } : set
          )
        }))
        setWorkout(updated)
      }
    } catch (error) {
      console.error('Error updating set:', error)
      toast.error('Kunne ikke opdatere sæt')
    }
  }

  const addSet = async (exerciseId: string) => {
    try {
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise) return

      const nextIndex = exercise.sets.length + 1

      const { data: newSet, error } = await supabase
        .from('sets')
        .insert({
          exercise_id: exerciseId,
          set_index: nextIndex,
          reps: null,
          weight_kg: null,
          completed: false
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      if (workout) {
        const updated = { ...workout }
        updated.exercises = updated.exercises.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, newSet] }
            : ex
        )
        setWorkout(updated)
      }

      toast.success('Sæt tilføjet')
    } catch (error) {
      console.error('Error adding set:', error)
      toast.error('Kunne ikke tilføje sæt')
    }
  }

  const copyLastSet = async (exerciseId: string) => {
    try {
      const exercise = workout?.exercises.find(ex => ex.id === exerciseId)
      if (!exercise || exercise.sets.length === 0) return

      const lastSet = exercise.sets[exercise.sets.length - 1]
      const nextIndex = exercise.sets.length + 1

      const { data: newSet, error } = await supabase
        .from('sets')
        .insert({
          exercise_id: exerciseId,
          set_index: nextIndex,
          reps: lastSet.reps,
          weight_kg: lastSet.weight_kg,
          completed: false
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      if (workout) {
        const updated = { ...workout }
        updated.exercises = updated.exercises.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: [...ex.sets, newSet] }
            : ex
        )
        setWorkout(updated)
      }

      toast.success('Sæt kopieret')
    } catch (error) {
      console.error('Error copying set:', error)
      toast.error('Kunne ikke kopiere sæt')
    }
  }

  const deleteSet = async (setId: string, exerciseId: string) => {
    try {
      const { error } = await supabase
        .from('sets')
        .delete()
        .eq('id', setId)

      if (error) throw error

      // Update local state
      if (workout) {
        const updated = { ...workout }
        updated.exercises = updated.exercises.map(ex =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
            : ex
        )
        setWorkout(updated)
      }

      toast.success('Sæt slettet')
    } catch (error) {
      console.error('Error deleting set:', error)
      toast.error('Kunne ikke slette sæt')
    }
  }

  const completeWorkout = async () => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({ completed: true })
        .eq('id', id)

      if (error) throw error

      toast.success('Workout gennemført! 🎉')
      navigate('/')
    } catch (error) {
      console.error('Error completing workout:', error)
      toast.error('Kunne ikke gennemføre workout')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Workout ikke fundet</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">
          Tilbage til Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">
            {workout.name_override || 'Workout'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {format(new Date(workout.date), 'EEEE, d. MMMM yyyy')}
          </p>
        </div>
        {workout.completed && (
          <span className="text-3xl">✅</span>
        )}
      </div>

      {/* Exercises */}
      {workout.exercises.map((exercise) => {
        const suggestion = suggestions.get(exercise.id)
        
        return (
          <div key={exercise.id} className="exercise-card">
            <div className="mb-3">
              <h3 className="text-xl font-semibold">{exercise.name}</h3>
              {suggestion && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex gap-4">
                  {suggestion.lastUsed && (
                    <span>Sidst: {suggestion.lastUsed}kg</span>
                  )}
                  {suggestion.bestSet && (
                    <span>Bedst: {suggestion.bestSet}kg</span>
                  )}
                  {suggestion.estimated1RM && (
                    <span>Est. 1RM: {suggestion.estimated1RM}kg</span>
                  )}
                </div>
              )}
            </div>

            {/* Sets table */}
            <div className="space-y-1 mb-3">
              {exercise.sets.map((set) => (
                <div key={set.id} className="set-row">
                  <div className="w-8 text-center font-medium text-gray-600 dark:text-gray-400">
                    {set.set_index}
                  </div>
                  
                  <input
                    type="number"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(set.id, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Reps"
                    className="input flex-1 text-center"
                    inputMode="numeric"
                  />
                  
                  <input
                    type="number"
                    value={set.weight_kg || ''}
                    onChange={(e) => updateSet(set.id, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder={suggestion?.suggested ? `${suggestion.suggested}kg` : 'kg'}
                    className="input flex-1 text-center"
                    inputMode="decimal"
                    step="2.5"
                  />
                  
                  <button
                    onClick={() => updateSet(set.id, 'completed', !set.completed)}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                      set.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {set.completed ? '✓' : ''}
                  </button>
                  
                  <button
                    onClick={() => deleteSet(set.id, exercise.id)}
                    className="btn-ghost text-red-600 px-3"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Exercise actions */}
            <div className="flex gap-2">
              <button
                onClick={() => addSet(exercise.id)}
                className="btn-secondary flex-1 text-sm"
              >
                ➕ Tilføj sæt
              </button>
              <button
                onClick={() => copyLastSet(exercise.id)}
                className="btn-secondary flex-1 text-sm"
                disabled={exercise.sets.length === 0}
              >
                📋 Kopiér sidste
              </button>
            </div>
          </div>
        )
      })}

      {/* Complete workout button */}
      {!workout.completed && (
        <button
          onClick={completeWorkout}
          className="btn-primary w-full text-lg py-4"
        >
          ✅ Afslut Workout
        </button>
      )}
    </div>
  )
}
