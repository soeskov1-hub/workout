import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { OneRepMax } from '../types/database'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import ExerciseSelector from '../components/ExerciseSelector'

// Create an untyped client for this table to work around type inference issues
const untypedSupabase = supabase as any

export default function OneRMManager() {
  const [oneRMs, setOneRMs] = useState<OneRepMax[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRM, setEditingRM] = useState<OneRepMax | null>(null)
  const [exerciseCatalogId, setExerciseCatalogId] = useState<string | null>(null)
  const [exerciseName, setExerciseName] = useState('')
  const [oneRM, setOneRM] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    loadOneRMs()
  }, [])

  async function loadOneRMs() {
    try {
      const { data, error } = await untypedSupabase
        .from('one_rep_maxes')
        .select('*')
        .order('exercise_name', { ascending: true })
        .order('date', { ascending: false })

      if (error) throw error
      setOneRMs(data || [])
    } catch (error) {
      console.error('Error loading 1RMs:', error)
    } finally {
      setLoading(false)
    }
  }

  function openModal(rm?: OneRepMax) {
    if (rm) {
      setEditingRM(rm)
      setExerciseCatalogId(rm.exercise_catalog_id || null)
      setExerciseName(rm.exercise_name || '')
      setOneRM(rm.one_rm.toString())
      setDate(rm.date)
    } else {
      setEditingRM(null)
      setExerciseCatalogId(null)
      setExerciseName('')
      setOneRM('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingRM(null)
    setExerciseCatalogId(null)
    setExerciseName('')
    setOneRM('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const rmValue = parseFloat(oneRM)
    if (!exerciseCatalogId || !exerciseName.trim() || isNaN(rmValue) || rmValue <= 0) {
      alert('Udfyld venligst alle felter korrekt')
      return
    }

    try {
      if (editingRM) {
        const { error } = await untypedSupabase
          .from('one_rep_maxes')
          .update({
            exercise_catalog_id: exerciseCatalogId,
            exercise_name: exerciseName.trim(),
            one_rm: rmValue,
            date: date
          })
          .eq('id', editingRM.id)

        if (error) throw error
      } else {
        const { error } = await untypedSupabase
          .from('one_rep_maxes')
          .insert({
            exercise_catalog_id: exerciseCatalogId,
            exercise_name: exerciseName.trim(),
            one_rm: rmValue,
            date: date
          })

        if (error) throw error
      }

      await loadOneRMs()
      closeModal()
    } catch (error) {
      console.error('Error saving 1RM:', error)
      alert('Fejl ved gemning af 1RM')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne 1RM?')) return

    try {
      const { error } = await untypedSupabase
        .from('one_rep_maxes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadOneRMs()
    } catch (error) {
      console.error('Error deleting 1RM:', error)
      alert('Fejl ved sletning af 1RM')
    }
  }

  // Group 1RMs by exercise name
  const groupedRMs = oneRMs.reduce((acc, rm) => {
    if (!acc[rm.exercise_name]) {
      acc[rm.exercise_name] = []
    }
    acc[rm.exercise_name].push(rm)
    return acc
  }, {} as Record<string, OneRepMax[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Indlæser...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">1RM Styring</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Tilføj 1RM
        </button>
      </div>

      {Object.keys(groupedRMs).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ingen 1RM data endnu
          </p>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Tilføj din første 1RM
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRMs).map(([exerciseName, rms]) => {
            const latest = rms[0]
            const previous = rms[1]
            const change = previous ? latest.one_rm - previous.one_rm : 0

            return (
              <div
                key={exerciseName}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {exerciseName}
                    </h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {latest.one_rm} kg
                      </span>
                      {change !== 0 && (
                        <span className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {format(new Date(latest.date), 'PPP', { locale: da })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(latest)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => handleDelete(latest.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Slet
                    </button>
                  </div>
                </div>

                {rms.length > 1 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      Se historik ({rms.length - 1} tidligere)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {rms.slice(1).map((rm) => (
                        <div
                          key={rm.id}
                          className="flex justify-between items-center text-sm py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {rm.one_rm} kg
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              {format(new Date(rm.date), 'PPP', { locale: da })}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(rm.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            Slet
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingRM ? 'Rediger 1RM' : 'Tilføj 1RM'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Øvelse
                </label>
                <ExerciseSelector
                  value={exerciseCatalogId}
                  onChange={(id, name) => {
                    setExerciseCatalogId(id)
                    setExerciseName(name)
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  1RM (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={oneRM}
                  onChange={(e) => setOneRM(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dato
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuller
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingRM ? 'Gem' : 'Tilføj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
