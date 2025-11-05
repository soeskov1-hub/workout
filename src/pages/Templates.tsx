import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TemplateWithExercises, TemplateExercise } from '../types/database'
import { toast } from 'sonner'

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithExercises | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [exercises, setExercises] = useState<Array<{
    name: string
    default_sets: number
    default_reps: number
  }>>([])

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*, template_exercises(*)')
        .order('name')

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Kunne ikke indlæse templates')
    }
  }

  const openModal = (template?: TemplateWithExercises) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateName(template.name)
      setExercises(template.template_exercises.map(ex => ({
        name: ex.name,
        default_sets: ex.default_sets || 3,
        default_reps: ex.default_reps || 10,
      })))
    } else {
      setEditingTemplate(null)
      setTemplateName('')
      setExercises([{ name: '', default_sets: 3, default_reps: 10 }])
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTemplate(null)
    setTemplateName('')
    setExercises([])
  }

  const addExercise = () => {
    setExercises([...exercises, { name: '', default_sets: 3, default_reps: 10 }])
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, field: string, value: string | number) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Indtast template navn')
      return
    }

    if (exercises.length === 0 || exercises.some(ex => !ex.name.trim())) {
      toast.error('Alle øvelser skal have et navn')
      return
    }

    try {
      if (editingTemplate) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('templates')
          .update({ name: templateName })
          .eq('id', editingTemplate.id)

        if (templateError) throw templateError

        // Delete old exercises
        const { error: deleteError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', editingTemplate.id)

        if (deleteError) throw deleteError

        // Insert new exercises
        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercises.map((ex, index) => ({
            template_id: editingTemplate.id,
            name: ex.name,
            default_sets: ex.default_sets,
            default_reps: ex.default_reps,
            order_index: index,
          })))

        if (exercisesError) throw exercisesError

        toast.success('Template opdateret!')
      } else {
        // Create new template
        const { data: template, error: templateError } = await supabase
          .from('templates')
          .insert({ name: templateName })
          .select()
          .single()

        if (templateError) throw templateError

        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercises.map((ex, index) => ({
            template_id: template.id,
            name: ex.name,
            default_sets: ex.default_sets,
            default_reps: ex.default_reps,
            order_index: index,
          })))

        if (exercisesError) throw exercisesError

        toast.success('Template oprettet!')
      }

      closeModal()
      loadTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Kunne ikke gemme template')
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne template?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Template slettet!')
      loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Kunne ikke slette template')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Templates</h2>
        <button onClick={() => openModal()} className="btn-primary">
          ➕ Ny Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">Ingen templates endnu</p>
          <button onClick={() => openModal()} className="btn-primary">
            Opret din første template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(template => (
            <div key={template.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.template_exercises.length} øvelser
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(template)}
                    className="btn-ghost text-sm"
                  >
                    ✏️ Rediger
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="btn-ghost text-sm text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {template.template_exercises
                  .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                  .map((ex, index) => (
                    <div
                      key={ex.id}
                      className="text-sm text-gray-700 dark:text-gray-300 flex justify-between"
                    >
                      <span>{index + 1}. {ex.name}</span>
                      <span className="text-gray-500">
                        {ex.default_sets} × {ex.default_reps}
                      </span>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4">
                {editingTemplate ? 'Rediger Template' : 'Ny Template'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Template navn</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="fx Upper Body"
                    className="input"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Øvelser</label>
                    <button onClick={addExercise} className="btn-ghost text-sm">
                      ➕ Tilføj øvelse
                    </button>
                  </div>

                  <div className="space-y-3">
                    {exercises.map((exercise, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => updateExercise(index, 'name', e.target.value)}
                            placeholder="Øvelse navn"
                            className="input"
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            value={exercise.default_sets}
                            onChange={(e) => updateExercise(index, 'default_sets', parseInt(e.target.value))}
                            placeholder="Sets"
                            className="input text-center"
                            min="1"
                          />
                          <div className="text-xs text-center text-gray-500 mt-1">sets</div>
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            value={exercise.default_reps}
                            onChange={(e) => updateExercise(index, 'default_reps', parseInt(e.target.value))}
                            placeholder="Reps"
                            className="input text-center"
                            min="1"
                          />
                          <div className="text-xs text-center text-gray-500 mt-1">reps</div>
                        </div>
                        <button
                          onClick={() => removeExercise(index)}
                          className="btn-ghost text-red-600 px-3"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={closeModal} className="btn-secondary flex-1">
                  Annuller
                </button>
                <button onClick={saveTemplate} className="btn-primary flex-1">
                  💾 Gem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
