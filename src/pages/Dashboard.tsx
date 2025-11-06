import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TemplateWithExercises, Workout } from '../types/database'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function Dashboard() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    weekWorkouts: 0,
    totalVolume: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*, template_exercises(*)')
        .order('name')

      if (templatesError) throw templatesError
      setTemplates(templatesData || [])

      // Load recent workouts
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: false })
        .limit(5)

      if (workoutsError) throw workoutsError
      setRecentWorkouts(workoutsData || [])

      // Calculate stats
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const { data: weekWorkouts, error: statsError } = await supabase
        .from('workouts')
        .select('id')
        .gte('date', format(weekAgo, 'yyyy-MM-dd'))

      if (!statsError) {
        setStats({
          weekWorkouts: weekWorkouts?.length || 0,
          totalVolume: 0, // Calculate if needed
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Kunne ikke indlæse data')
    }
  }

  const handleStartWorkout = async () => {
    if (!selectedTemplateId) {
      toast.error('Vælg en template')
      return
    }

    setLoading(true)
    try {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) throw new Error('Template not found')

      // Create workout
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          date: selectedDate,
          template_id: selectedTemplateId,
          completed: false,
        })
        .select()
        .single()

      if (workoutError) throw workoutError

      // Create exercises from template
      const exercises = template.template_exercises
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((te, index) => ({
          workout_id: workout.id,
          name: te.name,
          exercise_catalog_id: te.exercise_catalog_id,
          order_index: index,
        }))

      const { data: createdExercises, error: exercisesError } = await supabase
        .from('exercises')
        .insert(exercises)
        .select()

      if (exercisesError) throw exercisesError

      // Create default sets for each exercise
      const sets = createdExercises.flatMap((exercise, exIndex) => {
        const templateExercise = template.template_exercises[exIndex]
        const numSets = templateExercise.default_sets || 3
        return Array.from({ length: numSets }, (_, i) => ({
          exercise_id: exercise.id,
          set_index: i + 1,
          reps: templateExercise.default_reps || null,
          weight_kg: null,
          completed: false,
        }))
      })

      const { error: setsError } = await supabase
        .from('sets')
        .insert(sets)

      if (setsError) throw setsError

      toast.success('Workout oprettet!')
      navigate(`/workout/${workout.id}`)
    } catch (error) {
      console.error('Error creating workout:', error)
      toast.error('Kunne ikke oprette workout')
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuickWorkout = async () => {
    setLoading(true)
    try {
      // Create empty workout without template
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          date: selectedDate,
          template_id: null,
          name_override: 'Quick Workout',
          completed: false,
        })
        .select()
        .single()

      if (workoutError) throw workoutError

      toast.success('Tom workout oprettet!')
      navigate(`/workout/${workout.id}`)
    } catch (error) {
      console.error('Error creating quick workout:', error)
      toast.error('Kunne ikke oprette workout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Denne uge</div>
          <div className="text-3xl font-bold text-primary-600">{stats.weekWorkouts}</div>
          <div className="text-xs text-gray-500">workouts</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 dark:text-gray-400">Templates</div>
          <div className="text-3xl font-bold text-primary-600">{templates.length}</div>
          <div className="text-xs text-gray-500">tilgængelige</div>
        </div>
      </div>

      {/* Start Workout */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Start ny workout</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Dato</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Vælg template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="input"
            >
              <option value="">-- Vælg template --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.template_exercises.length} øvelser)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartWorkout}
              disabled={loading || !selectedTemplateId}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Opretter...' : '🚀 Fra Template'}
            </button>
            
            <button
              onClick={handleStartQuickWorkout}
              disabled={loading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Opretter...' : '⚡ Tom Workout'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Seneste workouts</h3>
        {recentWorkouts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Ingen workouts endnu</p>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map(workout => (
              <button
                key={workout.id}
                onClick={() => navigate(`/workout/${workout.id}`)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">
                      {workout.name_override || 'Workout'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(workout.date), 'dd/MM/yyyy')}
                    </div>
                  </div>
                  <div className="text-2xl">
                    {workout.completed ? '✅' : '⏳'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
