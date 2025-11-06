import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { WorkoutWithExercises, ExerciseWithSets, OneRepMax } from '../types/database'
import type { Set } from '../types/database'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { getSmartWeightSuggestion, calculate1RMFromSet, getSuggestedWeightFromRM } from '../lib/rmCalculations'
import ExerciseSelector from '../components/ExerciseSelector'

// Create an untyped client for one_rep_maxes table
const untypedSupabase = supabase as any

interface WeightSuggestion {
  exerciseName: string
  lastUsed: number | null
  bestSet: number | null
  estimated1RM: number | null
  suggested: number | null
  smartSuggestion?: {
    weight: number
    reason: string
    increase: number
  }
}

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null)
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<Map<string, WeightSuggestion>>(new Map())
  const [show1RMPredictions, setShow1RMPredictions] = useState(true)
  const [exerciseOneRMs, setExerciseOneRMs] = useState<Map<string, number>>(new Map())
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [newExerciseCatalogId, setNewExerciseCatalogId] = useState<string | null>(null)
  const [newExerciseName, setNewExerciseName] = useState('')

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
      
      // Load 1RMs for all exercises
      await load1RMsForExercises(sortedWorkout.exercises)
    } catch (error) {
      console.error('Error loading workout:', error)
      toast.error('Kunne ikke indlæse workout')
    } finally {
      setLoading(false)
    }
  }

  const load1RMsForExercises = async (exercises: ExerciseWithSets[]) => {
    const newOneRMs = new Map<string, number>()
    
    for (const exercise of exercises) {
      if (exercise.exercise_catalog_id) {
        const { data: oneRMData } = await untypedSupabase
          .from('one_rep_maxes')
          .select('*')
          .eq('exercise_catalog_id', exercise.exercise_catalog_id)
          .order('date', { ascending: false })
          .limit(1)
        
        if (oneRMData?.[0]?.one_rm) {
          newOneRMs.set(exercise.id, oneRMData[0].one_rm)
        }
      }
    }
    
    setExerciseOneRMs(newOneRMs)
  }

  const getWeightSuggestionForSet = (exerciseId: string, reps: number | null): number | null => {
    if (!reps || !show1RMPredictions) return null
    
    const oneRM = exerciseOneRMs.get(exerciseId)
    if (!oneRM) return null
    
    const suggestion = getSuggestedWeightFromRM(oneRM, reps)
    return suggestion
  }

  const loadWeightSuggestions = async (exercises: ExerciseWithSets[]) => {
    const newSuggestions = new Map<string, WeightSuggestion>()

    for (const exercise of exercises) {
      // Get the user's 1RM for this exercise from the database using exercise_catalog_id
      let userOneRM: number | null = null
      
      if (exercise.exercise_catalog_id) {
        const { data: oneRMData } = await untypedSupabase
          .from('one_rep_maxes')
          .select('*')
          .eq('exercise_catalog_id', exercise.exercise_catalog_id)
          .order('date', { ascending: false })
          .limit(1)
        
        userOneRM = oneRMData?.[0]?.one_rm || null
      }

      // Get historical data for this exercise (last 10 workouts)
      let historicalSets: any[] = []
      
      if (exercise.exercise_catalog_id) {
        const { data, error } = await supabase
          .from('sets')
          .select(`
            *,
            exercises!inner (
              exercise_catalog_id,
              workouts!inner (
                date
              )
            )
          `)
          .eq('exercises.exercise_catalog_id', exercise.exercise_catalog_id)
          .not('weight_kg', 'is', null)
          .not('reps', 'is', null)
          .eq('completed', true)
          .order('exercises.workouts.date', { ascending: false })
          .limit(30)

        if (error) {
          console.error('Error loading history:', error)
        } else {
          historicalSets = data || []
        }
      }

      let lastUsed: number | null = null
      let bestSet: number | null = null
      let estimated1RM: number | null = null
      const recentWeights: number[] = []

      if (historicalSets && historicalSets.length > 0) {
        // Last used weight
        lastUsed = historicalSets[0].weight_kg

        // Best set by weight
        bestSet = Math.max(...historicalSets.map((s: any) => s.weight_kg || 0))

        // Get recent weights for the last 3 sessions (taking first set of each unique workout)
        const uniqueDates = [...new Set(historicalSets.map((s: any) => s.exercises.workouts.date))]
        for (const date of uniqueDates.slice(0, 3)) {
          const setOnDate = historicalSets.find((s: any) => s.exercises.workouts.date === date)
          if (setOnDate && setOnDate.weight_kg) {
            recentWeights.push(setOnDate.weight_kg)
          }
        }

        // Calculate estimated 1RM from historical data using Brzycki formula
        const estimatedMax = Math.max(
          ...historicalSets.map((s: any) => {
            const rm = calculate1RMFromSet(s.weight_kg || 0, s.reps || 1)
            return rm || 0
          })
        )
        estimated1RM = estimatedMax > 0 ? Math.round(estimatedMax * 2) / 2 : null

        // Get target reps from the first set of this exercise (or default to 5)
        const targetReps = exercise.sets[0]?.reps || 5

        // Use smart weight suggestion algorithm
        const smartSugg = getSmartWeightSuggestion(
          userOneRM,
          targetReps,
          recentWeights,
          8 // Default RPE target
        )

        newSuggestions.set(exercise.id, {
          exerciseName: exercise.name,
          lastUsed,
          bestSet,
          estimated1RM,
          suggested: smartSugg.suggestedWeight,
          smartSuggestion: {
            weight: smartSugg.suggestedWeight,
            reason: smartSugg.reason,
            increase: smartSugg.increase
          }
        })
      } else {
        // No historical data - use 1RM if available
        if (userOneRM) {
          const targetReps = exercise.sets[0]?.reps || 5
          const smartSugg = getSmartWeightSuggestion(userOneRM, targetReps, [], 8)
          
          newSuggestions.set(exercise.id, {
            exerciseName: exercise.name,
            lastUsed: null,
            bestSet: null,
            estimated1RM: null,
            suggested: smartSugg.suggestedWeight,
            smartSuggestion: {
              weight: smartSugg.suggestedWeight,
              reason: smartSugg.reason,
              increase: smartSugg.increase
            }
          })
        }
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
        
        updated.exercises = updated.exercises.map(ex => {
          const updatedSets = ex.sets.map(set => {
            if (set.id === setId) {
              return { ...set, [field]: value }
            }
            return set
          })
          return { ...ex, sets: updatedSets }
        })
        
        setWorkout(updated)
        
        // If reps were changed, trigger a re-render by updating state
        // (this will cause getWeightSuggestionForSet to recalculate with new reps)
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

  const addNewExercise = async () => {
    if (!newExerciseCatalogId || !newExerciseName) {
      toast.error('Vælg en øvelse')
      return
    }

    try {
      const nextOrderIndex = workout?.exercises.length || 0

      const { data: newExercise, error: exerciseError } = await supabase
        .from('exercises')
        .insert({
          workout_id: id,
          name: newExerciseName,
          exercise_catalog_id: newExerciseCatalogId,
          order_index: nextOrderIndex,
        })
        .select()
        .single()

      if (exerciseError) throw exerciseError

      // Add 3 default sets
      const { error: setsError } = await supabase
        .from('sets')
        .insert([
          { exercise_id: newExercise.id, set_index: 1, reps: null, weight_kg: null, completed: false },
          { exercise_id: newExercise.id, set_index: 2, reps: null, weight_kg: null, completed: false },
          { exercise_id: newExercise.id, set_index: 3, reps: null, weight_kg: null, completed: false },
        ])

      if (setsError) throw setsError

      toast.success('Øvelse tilføjet!')
      setShowAddExerciseModal(false)
      setNewExerciseCatalogId(null)
      setNewExerciseName('')
      loadWorkout()
    } catch (error) {
      console.error('Error adding exercise:', error)
      toast.error('Kunne ikke tilføje øvelse')
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

      {/* 1RM Predictions Toggle */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💪</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                1RM Intelligente Forudsigelser
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {show1RMPredictions 
                  ? 'Vægtforslag baseret på din 1RM og træningshistorik'
                  : 'Klik for at aktivere smarte vægtforslag'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow1RMPredictions(!show1RMPredictions)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              show1RMPredictions 
                ? 'bg-blue-600' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                show1RMPredictions ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Exercises */}
      {workout.exercises.map((exercise) => {
        const suggestion = suggestions.get(exercise.id)
        
        return (
          <div key={exercise.id} className="exercise-card">
            <div className="mb-3">
              <h3 className="text-xl font-semibold">{exercise.name}</h3>
              {show1RMPredictions && suggestion && suggestion.smartSuggestion && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        💡 Anbefaling: {suggestion.smartSuggestion.weight} kg
                        {suggestion.smartSuggestion.increase !== 0 && (
                          <span className={suggestion.smartSuggestion.increase > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                            {' '}({suggestion.smartSuggestion.increase > 0 ? '+' : ''}{suggestion.smartSuggestion.increase} kg)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                        {suggestion.smartSuggestion.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {suggestion && !suggestion.smartSuggestion && (
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
              {exercise.sets.map((set) => {
                const setWeightSuggestion = getWeightSuggestionForSet(exercise.id, set.reps)
                
                return (
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
                      placeholder={setWeightSuggestion ? `${setWeightSuggestion}kg` : (suggestion?.suggested ? `${suggestion.suggested}kg` : 'kg')}
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
                )
              })}
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

      {/* Add Exercise Button */}
      {!workout.completed && (
        <button
          onClick={() => setShowAddExerciseModal(true)}
          className="btn-secondary w-full"
        >
          ➕ Tilføj Øvelse
        </button>
      )}

      {/* Complete workout button */}
      {!workout.completed && (
        <button
          onClick={completeWorkout}
          className="btn-primary w-full text-lg py-4"
        >
          ✅ Afslut Workout
        </button>
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Tilføj Øvelse
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vælg øvelse
                </label>
                <ExerciseSelector
                  value={newExerciseCatalogId}
                  onChange={(id, name) => {
                    setNewExerciseCatalogId(id)
                    setNewExerciseName(name)
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExerciseModal(false)
                    setNewExerciseCatalogId(null)
                    setNewExerciseName('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuller
                </button>
                <button
                  onClick={addNewExercise}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Tilføj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
