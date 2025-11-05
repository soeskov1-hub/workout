import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Workout } from '../types/database'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { toast } from 'sonner'

export default function History() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [filteredWorkouts, setFilteredWorkouts] = useState<Workout[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    loadWorkouts()
  }, [])

  useEffect(() => {
    filterWorkouts()
  }, [searchQuery, workouts])

  const loadWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setWorkouts(data || [])
    } catch (error) {
      console.error('Error loading workouts:', error)
      toast.error('Kunne ikke indlæse historik')
    }
  }

  const filterWorkouts = () => {
    if (!searchQuery.trim()) {
      setFilteredWorkouts(workouts)
      return
    }

    const filtered = workouts.filter(workout => {
      const searchLower = searchQuery.toLowerCase()
      return (
        workout.name_override?.toLowerCase().includes(searchLower) ||
        workout.notes?.toLowerCase().includes(searchLower) ||
        format(new Date(workout.date), 'dd/MM/yyyy').includes(searchQuery)
      )
    })
    setFilteredWorkouts(filtered)
  }

  const cloneWorkout = async (workoutId: string) => {
    try {
      // Get the original workout with exercises and sets
      const { data: originalWorkout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          exercises (
            *,
            sets (*)
          )
        `)
        .eq('id', workoutId)
        .single()

      if (workoutError) throw workoutError

      // Create new workout for today
      const { data: newWorkout, error: newWorkoutError } = await supabase
        .from('workouts')
        .insert({
          date: format(new Date(), 'yyyy-MM-dd'),
          template_id: originalWorkout.template_id,
          name_override: originalWorkout.name_override,
          completed: false,
        })
        .select()
        .single()

      if (newWorkoutError) throw newWorkoutError

      // Clone exercises
      const exercises = originalWorkout.exercises
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((ex: any) => ({
          workout_id: newWorkout.id,
          name: ex.name,
          order_index: ex.order_index,
        }))

      const { data: newExercises, error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercises)
        .select()

      if (exercisesError) throw exercisesError

      // Clone sets
      const originalExercises = originalWorkout.exercises.sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
      )

      const sets = newExercises.flatMap((newEx: any, index: number) => {
        const originalEx = originalExercises[index]
        return originalEx.sets
          .sort((a: any, b: any) => a.set_index - b.set_index)
          .map((set: any) => ({
            exercise_id: newEx.id,
            set_index: set.set_index,
            reps: set.reps,
            weight_kg: set.weight_kg,
            completed: false,
          }))
      })

      const { error: setsError } = await supabase
        .from('sets')
        .insert(sets)

      if (setsError) throw setsError

      toast.success('Workout klonet til i dag!')
      navigate(`/workout/${newWorkout.id}`)
    } catch (error) {
      console.error('Error cloning workout:', error)
      toast.error('Kunne ikke klone workout')
    }
  }

  const deleteWorkout = async (workoutId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne workout?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)

      if (error) throw error

      toast.success('Workout slettet')
      loadWorkouts()
    } catch (error) {
      console.error('Error deleting workout:', error)
      toast.error('Kunne ikke slette workout')
    }
  }

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const workoutsByDate = new Map<string, Workout[]>()
    workouts.forEach(workout => {
      const dateKey = workout.date
      if (!workoutsByDate.has(dateKey)) {
        workoutsByDate.set(dateKey, [])
      }
      workoutsByDate.get(dateKey)?.push(workout)
    })

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="btn-ghost"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="btn-ghost"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
          
          {/* Padding for days before month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`padding-${i}`} />
          ))}
          
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayWorkouts = workoutsByDate.get(dateKey) || []
            const isToday = isSameDay(day, new Date())

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  if (dayWorkouts.length > 0) {
                    navigate(`/workout/${dayWorkouts[0].id}`)
                  }
                }}
                className={`aspect-square p-2 rounded-lg border transition-colors ${
                  isToday
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                    : 'border-gray-200 dark:border-gray-700'
                } ${
                  dayWorkouts.length > 0
                    ? 'bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                {dayWorkouts.length > 0 && (
                  <div className="text-xs text-green-700 dark:text-green-300">
                    {dayWorkouts[0].completed ? '✓' : '•'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Historik</h2>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}
        >
          📋 Liste
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}
        >
          📅 Kalender
        </button>
      </div>

      {viewMode === 'list' && (
        <>
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søg efter workout..."
            className="input"
          />

          {/* Workouts list */}
          {filteredWorkouts.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? 'Ingen workouts fundet' : 'Ingen workouts endnu'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkouts.map(workout => (
                <div key={workout.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {workout.name_override || 'Workout'}
                        {workout.completed && ' ✅'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(workout.date), 'EEEE, d. MMMM yyyy')}
                      </p>
                      {workout.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {workout.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/workout/${workout.id}`)}
                      className="btn-secondary flex-1 text-sm"
                    >
                      👁️ Se detaljer
                    </button>
                    <button
                      onClick={() => cloneWorkout(workout.id)}
                      className="btn-secondary flex-1 text-sm"
                    >
                      📋 Klon til i dag
                    </button>
                    <button
                      onClick={() => deleteWorkout(workout.id)}
                      className="btn-ghost text-red-600 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'calendar' && (
        <div className="card">
          {renderCalendar()}
        </div>
      )}
    </div>
  )
}
