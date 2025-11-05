import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fbczoogchwqkitagozjj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY3pvb2djaHdxa2l0YWdvempqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDMzMjQsImV4cCI6MjA3Nzg3OTMyNH0.vEjdkpkui5OH5ibClvwHHd1OweO0VQzswYOK1j9x928'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function seed() {
  console.log('🌱 Starting seed...')

  try {
    // Clean existing data (careful in production!)
    console.log('Cleaning existing data...')
    await supabase.from('sets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('workouts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('template_exercises').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('templates').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Create templates
    console.log('Creating templates...')
    
    // Upper Body Template
    const { data: upperTemplate, error: upperError } = await supabase
      .from('templates')
      .insert({ name: 'Upper Body' })
      .select()
      .single()

    if (upperError) throw upperError

    const upperExercises = [
      { name: 'Bench Press', default_sets: 4, default_reps: 8, order_index: 0 },
      { name: 'Overhead Press', default_sets: 3, default_reps: 10, order_index: 1 },
      { name: 'Bent Over Row', default_sets: 4, default_reps: 10, order_index: 2 },
      { name: 'Pull-ups', default_sets: 3, default_reps: 8, order_index: 3 },
      { name: 'Bicep Curls', default_sets: 3, default_reps: 12, order_index: 4 },
      { name: 'Tricep Dips', default_sets: 3, default_reps: 12, order_index: 5 },
    ]

    await supabase.from('template_exercises').insert(
      upperExercises.map(ex => ({ ...ex, template_id: upperTemplate.id }))
    )

    // Lower Body Template
    const { data: lowerTemplate, error: lowerError } = await supabase
      .from('templates')
      .insert({ name: 'Lower Body' })
      .select()
      .single()

    if (lowerError) throw lowerError

    const lowerExercises = [
      { name: 'Squat', default_sets: 4, default_reps: 8, order_index: 0 },
      { name: 'Romanian Deadlift', default_sets: 4, default_reps: 10, order_index: 1 },
      { name: 'Leg Press', default_sets: 3, default_reps: 12, order_index: 2 },
      { name: 'Leg Curls', default_sets: 3, default_reps: 12, order_index: 3 },
      { name: 'Calf Raises', default_sets: 4, default_reps: 15, order_index: 4 },
    ]

    await supabase.from('template_exercises').insert(
      lowerExercises.map(ex => ({ ...ex, template_id: lowerTemplate.id }))
    )

    console.log('✅ Templates created')

    // Create demo workouts (10 days of data)
    console.log('Creating demo workouts...')
    
    const today = new Date()
    const workoutData = []

    // Alternate between upper and lower body workouts
    for (let i = 9; i >= 0; i--) {
      const workoutDate = new Date(today)
      workoutDate.setDate(today.getDate() - i * 2) // Every other day
      
      const isUpper = i % 2 === 0
      const template = isUpper ? upperTemplate : lowerTemplate
      const exercises = isUpper ? upperExercises : lowerExercises

      workoutData.push({
        date: workoutDate,
        template,
        exercises,
        completed: i > 0 // Only the most recent is incomplete
      })
    }

    for (const workout of workoutData) {
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          date: workout.date.toISOString().split('T')[0],
          template_id: workout.template.id,
          completed: workout.completed,
        })
        .select()
        .single()

      if (workoutError) throw workoutError

      // Create exercises for this workout
      const { data: createdExercises, error: exercisesError } = await supabase
        .from('exercises')
        .insert(
          workout.exercises.map(ex => ({
            workout_id: newWorkout.id,
            name: ex.name,
            order_index: ex.order_index,
          }))
        )
        .select()

      if (exercisesError) throw exercisesError

      // Create sets with progressive overload
      const dayOffset = 9 - workoutData.indexOf(workout)
      
      for (let exIndex = 0; exIndex < createdExercises.length; exIndex++) {
        const exercise = createdExercises[exIndex]
        const templateEx = workout.exercises[exIndex]
        
        // Base weights for different exercises
        const baseWeights: Record<string, number> = {
          'Bench Press': 60,
          'Overhead Press': 40,
          'Bent Over Row': 50,
          'Pull-ups': 0, // bodyweight
          'Bicep Curls': 12,
          'Tricep Dips': 0, // bodyweight
          'Squat': 80,
          'Romanian Deadlift': 60,
          'Leg Press': 100,
          'Leg Curls': 40,
          'Calf Raises': 50,
        }

        const baseWeight = baseWeights[exercise.name] || 20
        const progressionWeight = baseWeight + (dayOffset * 2.5) // Progressive overload
        
        const sets = []
        for (let setNum = 1; setNum <= templateEx.default_sets; setNum++) {
          // Simulate progressive sets (slightly decreasing reps with fatigue)
          const reps = templateEx.default_reps - (setNum > 2 ? 1 : 0)
          
          sets.push({
            exercise_id: exercise.id,
            set_index: setNum,
            reps: reps,
            weight_kg: baseWeight > 0 ? progressionWeight : null,
            completed: workout.completed,
          })
        }

        const { error: setsError } = await supabase
          .from('sets')
          .insert(sets)

        if (setsError) throw setsError
      }

      console.log(`✅ Created workout for ${workout.date.toISOString().split('T')[0]}`)
    }

    console.log('✅ Seed completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding:', error)
    process.exit(1)
  }
}

seed()
