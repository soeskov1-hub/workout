import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface TrackingPeriod {
  id: string
  start_date: string
  end_date: string | null
  is_active: boolean | null
  created_at: string
}

interface VolumeByCategory {
  category: string
  total_sets: number
}

interface PeriodWithVolume extends TrackingPeriod {
  volume: VolumeByCategory[]
}

export default function WeeklyVolume() {
  const navigate = useNavigate()
  const [activePeriod, setActivePeriod] = useState<PeriodWithVolume | null>(null)
  const [completedPeriods, setCompletedPeriods] = useState<PeriodWithVolume[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const untypedSupabase = supabase as any

      // Hent aktiv periode
      const { data: activeData, error: activeError } = await untypedSupabase
        .from('tracking_periods')
        .select('*')
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .single()

      if (activeError && activeError.code !== 'PGRST116') {
        throw activeError
      }

      // Hent afsluttede perioder
      const { data: completedData, error: completedError } = await untypedSupabase
        .from('tracking_periods')
        .select('*')
        .eq('is_active', false)
        .order('start_date', { ascending: false })

      if (completedError) throw completedError

      // Beregn volume for aktiv periode
      if (activeData) {
        const volume = await calculateVolumeForPeriod(activeData.start_date, activeData.end_date)
        setActivePeriod({ ...activeData, volume })
      }

      // Beregn volume for afsluttede perioder
      const periodsWithVolume = await Promise.all(
        (completedData || []).map(async (period: any) => {
          const volume = await calculateVolumeForPeriod(period.start_date, period.end_date)
          return { ...period, volume }
        })
      )
      setCompletedPeriods(periodsWithVolume)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Kunne ikke indlæse data')
    } finally {
      setLoading(false)
    }
  }

  async function calculateVolumeForPeriod(
    startDate: string,
    endDate: string | null
  ): Promise<VolumeByCategory[]> {
    try {
      // Brug untypedSupabase for komplekse joins
      const untypedSupabase = supabase as any

      // Query: sets -> exercises -> exercise_catalog -> workouts
      // Filter: workout.date BETWEEN startDate AND (endDate || NOW())
      // Group by exercise_catalog.category
      const { data, error } = await untypedSupabase
        .from('sets')
        .select(`
          id,
          completed,
          exercises!inner (
            id,
            exercise_catalog_id,
            workout_id,
            exercise_catalog!inner (
              category
            ),
            workouts!inner (
              date
            )
          )
        `)
        .eq('completed', true)
        .gte('exercises.workouts.date', startDate)
        .lte('exercises.workouts.date', endDate || new Date().toISOString())

      if (error) throw error

      // Aggreger data manuelt
      const categoryMap: { [key: string]: number } = {}

      data?.forEach((set: any) => {
        const category = set.exercises?.exercise_catalog?.category || 'Ukendt'
        categoryMap[category] = (categoryMap[category] || 0) + 1
      })

      return Object.entries(categoryMap).map(([category, total_sets]) => ({
        category,
        total_sets,
      }))
    } catch (error) {
      console.error('Error calculating volume:', error)
      return []
    }
  }

  async function handleStartNewPeriod() {
    try {
      const untypedSupabase = supabase as any

      // Luk eventuelle åbne perioder først
      if (activePeriod) {
        const { error: updateError } = await untypedSupabase
          .from('tracking_periods')
          .update({ is_active: false, end_date: new Date().toISOString() })
          .eq('id', activePeriod.id)

        if (updateError) throw updateError
      }

      // Opret ny periode
      const { data, error } = await untypedSupabase
        .from('tracking_periods')
        .insert({
          start_date: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Ny tracking periode startet!')
      loadData()
    } catch (error: any) {
      console.error('Error starting period:', error)
      toast.error('Kunne ikke starte ny periode')
    }
  }

  async function handleStopPeriod() {
    if (!activePeriod) return

    try {
      const untypedSupabase = supabase as any

      const { error } = await untypedSupabase
        .from('tracking_periods')
        .update({ is_active: false, end_date: new Date().toISOString() })
        .eq('id', activePeriod.id)

      if (error) throw error

      toast.success('Periode afsluttet!')
      loadData()
    } catch (error: any) {
      console.error('Error stopping period:', error)
      toast.error('Kunne ikke afslutte periode')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Indlæser...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => navigate('/history')}
          className="text-blue-500 hover:text-blue-600 flex items-center gap-2"
        >
          ← Tilbage til Historie
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6">📊 Ugentlig Volume Tracking</h1>

      {/* Aktiv periode */}
      {activePeriod ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-green-800">Aktiv Periode</h2>
              <p className="text-sm text-green-600">
                Startet: {format(new Date(activePeriod.start_date), 'PPP', { locale: da })}
              </p>
            </div>
            <button
              onClick={handleStopPeriod}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              ⏹️ Stop & Gem
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold mb-2">Volume pr. muskelgruppe:</h3>
            {activePeriod.volume.length > 0 ? (
              activePeriod.volume.map((v) => (
                <div key={v.category} className="flex justify-between bg-white p-3 rounded">
                  <span className="font-medium">{v.category}</span>
                  <span className="text-green-700 font-bold">{v.total_sets} sæt</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">Ingen sæt registreret endnu</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-gray-600 mb-4">Ingen aktiv tracking periode</p>
          <button
            onClick={handleStartNewPeriod}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            📊 Start Ugentlig Tracking
          </button>
        </div>
      )}

      {/* Historie */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">📜 Tidligere Perioder</h2>
        {completedPeriods.length > 0 ? (
          <div className="space-y-4">
            {completedPeriods.map((period) => (
              <div key={period.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <div className="text-sm text-gray-600">
                    {format(new Date(period.start_date), 'PPP', { locale: da })} -{' '}
                    {period.end_date
                      ? format(new Date(period.end_date), 'PPP', { locale: da })
                      : 'Nu'}
                  </div>
                </div>
                <div className="space-y-1">
                  {period.volume.length > 0 ? (
                    period.volume.map((v) => (
                      <div key={v.category} className="flex justify-between text-sm">
                        <span>{v.category}</span>
                        <span className="font-semibold">{v.total_sets} sæt</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic">Ingen data</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Ingen afsluttede perioder endnu</p>
        )}
      </div>
    </div>
  )
}
