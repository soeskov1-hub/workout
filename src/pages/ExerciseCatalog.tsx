import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ExerciseCatalog } from '../types/database'
import { toast } from 'sonner'

const untypedSupabase = supabase as any

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other']

export default function ExerciseCatalogPage() {
  const [exercises, setExercises] = useState<ExerciseCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseCatalog | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Chest')
  const [isCompound, setIsCompound] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadExercises()
  }, [])

  async function loadExercises() {
    try {
      const { data, error } = await untypedSupabase
        .from('exercise_catalog')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error loading exercises:', error)
      toast.error('Kunne ikke indlæse øvelser')
    } finally {
      setLoading(false)
    }
  }

  function openModal(exercise?: ExerciseCatalog) {
    if (exercise) {
      setEditingExercise(exercise)
      setName(exercise.name)
      setCategory(exercise.category || 'Chest')
      setIsCompound(exercise.is_compound || false)
    } else {
      setEditingExercise(null)
      setName('')
      setCategory('Chest')
      setIsCompound(false)
    }
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingExercise(null)
    setName('')
    setCategory('Chest')
    setIsCompound(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Indtast øvelsesnavn')
      return
    }

    try {
      if (editingExercise) {
        const { error } = await untypedSupabase
          .from('exercise_catalog')
          .update({
            name: name.trim(),
            category: category,
            is_compound: isCompound
          })
          .eq('id', editingExercise.id)

        if (error) throw error
        toast.success('Øvelse opdateret')
      } else {
        const { error } = await untypedSupabase
          .from('exercise_catalog')
          .insert({
            name: name.trim(),
            category: category,
            is_compound: isCompound
          })

        if (error) throw error
        toast.success('Øvelse tilføjet')
      }

      await loadExercises()
      closeModal()
    } catch (error: any) {
      console.error('Error saving exercise:', error)
      if (error.code === '23505') {
        toast.error('Denne øvelse findes allerede')
      } else {
        toast.error('Kunne ikke gemme øvelse')
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne øvelse? Dette vil påvirke alle templates og 1RM data der bruger den.')) {
      return
    }

    try {
      const { error } = await untypedSupabase
        .from('exercise_catalog')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Øvelse slettet')
      await loadExercises()
    } catch (error) {
      console.error('Error deleting exercise:', error)
      toast.error('Kunne ikke slette øvelse')
    }
  }

  // Filter exercises
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || ex.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const cat = ex.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {} as Record<string, ExerciseCatalog[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Indlæser...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Øvelseskatalog</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Ny Øvelse
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Søg øvelser..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">Alle kategorier</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Exercise List */}
      {Object.keys(groupedExercises).length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ingen øvelser fundet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([cat, exs]) => (
            <div key={cat} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {cat} ({exs.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {exs.map(ex => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {ex.name}
                      </div>
                      {ex.is_compound && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Compound
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(ex)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {editingExercise ? 'Rediger Øvelse' : 'Ny Øvelse'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Navn
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="F.eks. Bænkpres"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isCompound"
                  checked={isCompound}
                  onChange={(e) => setIsCompound(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isCompound" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Compound øvelse (flerledsøvelse)
                </label>
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
                  {editingExercise ? 'Gem' : 'Tilføj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
