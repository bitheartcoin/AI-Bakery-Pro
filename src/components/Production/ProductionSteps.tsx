import React, { useState, useEffect, useCallback } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  X, 
  Thermometer, 
  Droplets,
  Timer,
  Save
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import IngredientCalculator from './IngredientCalculator'

interface ProductionStepsProps {
  batch: {
    id: string
    batch_number: string
    recipe_id: string
    recipe_name?: string
    batch_size: number
    status: string
  }
  steps: any[]
  loading: boolean
  onClose: () => void
  onStepUpdate: () => void
}

export default function ProductionSteps({ batch, steps: initialSteps, loading, onClose, onStepUpdate }: ProductionStepsProps) {
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [updatingStep, setUpdatingStep] = useState<string | null>(null)
  const [stepData, setStepData] = useState({
    actual_temperature: '',
    actual_humidity: '',
    notes: ''
  })
  const [recipeSteps, setRecipeSteps] = useState<any[]>(initialSteps || [])
  const [loadingSteps, setLoadingSteps] = useState(true)

  // useCallback használata a függvény újradefiniálásának elkerülésére
  const loadRecipeSteps = useCallback(async () => {
    try {
      setLoadingSteps(true)
      
      // Először ellenőrizzük, hogy vannak-e már gyártási lépések ehhez a tételhez
      const { data: existingSteps, error: existingError } = await supabase
        .from('production_steps')
        .select(`
          *,
          recipe_steps(*)
        `)
        .eq('batch_id', batch.id)
        .order('id')
      
      if (existingError) {
        console.error('Error loading existing steps:', existingError)
        toast.error('Hiba a gyártási lépések betöltésekor')
        return
      }
      
      if (existingSteps && existingSteps.length > 0) {
        setRecipeSteps(existingSteps)
        return
      }
      
      // Ha nincsenek gyártási lépések, akkor próbáljuk meg létrehozni őket
      
      // Először ellenőrizzük, hogy van-e recept a termékhez (products táblából)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', batch.recipe_id)
        .single()
      
      if (productError) {
        console.error('Error loading product:', productError)
        toast.error('Hiba a termék betöltésekor')
        return
      }
      
      // Ellenőrizzük, hogy van-e recept lépés a termékhez
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', batch.recipe_id)
        .order('step_number')
      
      if (recipeError) {
        console.error('Error loading recipe steps:', recipeError)
        toast.error('Hiba a recept lépések betöltésekor')
        return
      }
      
      if (recipeData && recipeData.length > 0) {
        // Létrehozzuk a gyártási lépéseket a recept alapján
        const productionStepsData = recipeData.map(step => ({
          batch_id: batch.id,
          step_id: step.id,
          status: 'pending'
        }))
        
        const { error: insertError } = await supabase
          .from('production_steps')
          .insert(productionStepsData)
        
        if (insertError) {
          console.error('Error creating production steps:', insertError)
          toast.error('Hiba a gyártási lépések létrehozásakor')
          return
        }
        
        // Újra betöltjük a most létrehozott lépéseket
        const { data: newSteps, error: newError } = await supabase
          .from('production_steps')
          .select(`
            *,
            recipe_steps(*)
          `)
          .eq('batch_id', batch.id)
          .order('id')
        
        if (newError) {
          console.error('Error loading new steps:', newError)
          toast.error('Hiba az új gyártási lépések betöltésekor')
          return
        }
        
        if (newSteps) {
          setRecipeSteps(newSteps)
        }
      } else {
        // Ha nincs recept, akkor próbáljunk meg alapértelmezett lépéseket létrehozni
        const defaultSteps = [
          {
            title: 'Előkészítés',
            description: 'Alapanyagok kimérése és előkészítése',
            duration_minutes: 15
          },
          {
            title: 'Dagasztás',
            description: 'Alapanyagok összekeverése és dagasztása',
            duration_minutes: 20
          },
          {
            title: 'Kelesztés',
            description: 'Tészta kelesztése',
            duration_minutes: 60,
            temperature: 30,
            humidity: 80
          },
          {
            title: 'Formázás',
            description: 'Tészta formázása',
            duration_minutes: 15
          },
          {
            title: 'Sütés',
            description: 'Tészta sütése',
            duration_minutes: 30,
            temperature: 220
          }
        ]
        
        // Először létrehozzuk a recept lépéseket
        const recipeStepsData = defaultSteps.map((step, index) => ({
          recipe_id: batch.recipe_id,
          step_number: index + 1,
          title: step.title,
          description: step.description,
          duration_minutes: step.duration_minutes,
          temperature: step.temperature,
          humidity: step.humidity
        }))
        
        const { data: insertedSteps, error: insertStepsError } = await supabase
          .from('recipe_steps')
          .insert(recipeStepsData)
          .select()
        
        if (insertStepsError) {
          console.error('Error creating default recipe steps:', insertStepsError)
          toast.error('Hiba az alapértelmezett recept lépések létrehozásakor')
          return
        }
        
        // Most létrehozzuk a gyártási lépéseket
        if (insertedSteps) {
          const productionStepsData = insertedSteps.map(step => ({
            batch_id: batch.id,
            step_id: step.id,
            status: 'pending'
          }))
          
          const { error: insertProdError } = await supabase
            .from('production_steps')
            .insert(productionStepsData)
          
          if (insertProdError) {
            console.error('Error creating production steps:', insertProdError)
            toast.error('Hiba a gyártási lépések létrehozásakor')
            return
          }
          
          // Újra betöltjük a most létrehozott lépéseket
          const { data: newSteps, error: newError } = await supabase
            .from('production_steps')
            .select(`
              *,
              recipe_steps(*)
            `)
            .eq('batch_id', batch.id)
            .order('id')
          
          if (newError) {
            console.error('Error loading new steps:', newError)
            toast.error('Hiba az új gyártási lépések betöltésekor')
            return
          }
          
          if (newSteps) {
            setRecipeSteps(newSteps)
          }
        }
      }
    } catch (error) {
      console.error('Error loading recipe steps:', error)
      toast.error('Hiba a recept lépések betöltésekor')
    } finally {
      setLoadingSteps(false)
    }
  }, [batch.id, batch.recipe_id])

  useEffect(() => {
    // Update recipeSteps when steps prop changes
    if (initialSteps && initialSteps.length > 0) {
      setRecipeSteps(initialSteps);
      setLoadingSteps(false);
    } else {
      loadRecipeSteps();
    }
  }, [batch.id, initialSteps, loadRecipeSteps]);

  // Remove this useEffect to avoid duplicate calls
  /*useEffect(() => {
    loadRecipeSteps()
  }, [batch.id])*/

  const toggleStep = (stepId: string) => {
    if (activeStep === stepId) {
      setActiveStep(null)
    } else {
      setActiveStep(stepId)
    }
  }

  const startStep = async (stepId: string) => {
    try {
      setUpdatingStep(stepId)
      
      const { error } = await supabase
        .from('production_steps')
        .update({
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .eq('id', stepId)
      
      if (error) {
        console.error('Error starting step:', error)
        toast.error('Hiba a lépés indításakor')
        return
      }
      
      toast.success('Lépés sikeresen elindítva!')
      onStepUpdate()
    } catch (error) {
      console.error('Error starting step:', error)
      toast.error('Hiba a lépés indításakor')
    } finally {
      setUpdatingStep(null)
    }
  }

  const completeStep = async (stepId: string) => {
    try {
      setUpdatingStep(stepId)

      // Validate temperature and humidity if provided
      const tempValue = stepData.actual_temperature.replace(/,/g, '.');
      if (stepData.actual_temperature && isNaN(parseFloat(tempValue))) {
        toast.error('Érvénytelen hőmérséklet érték')
        return
      }

      const humidityValue = stepData.actual_humidity.replace(/,/g, '.');
      if (stepData.actual_humidity && isNaN(parseFloat(humidityValue))) {
        toast.error('Érvénytelen páratartalom érték')
        return
      }

      // Prepare update data with properly formatted numeric values
      const updateData = {
        status: 'completed',
        end_time: new Date().toISOString(),
        actual_temperature: stepData.actual_temperature ? parseFloat(tempValue) : null,
        actual_humidity: stepData.actual_humidity ? parseFloat(humidityValue) : null,
        notes: stepData.notes || null
      }
      
      const { error } = await supabase
        .from('production_steps')
        .update(updateData)
        .eq('id', stepId)
      
      if (error) {
        console.error('Error completing step:', error)
        toast.error('Hiba a lépés befejezésekor')
        return
      }
      
      toast.success('Lépés sikeresen befejezve!')
      setStepData({
        actual_temperature: '',
        actual_humidity: '',
        notes: ''
      })
      onStepUpdate()
      
      // Check if all steps are completed
      const allCompleted = recipeSteps.every(step => 
        step.id === stepId ? true : step.status === 'completed'
      )
      
      if (allCompleted) {
        // Update batch status to completed
        try {
          const { error: batchError } = await supabase
            .from('production_batches')
            .update({ 
              status: 'completed',
              end_time: new Date().toISOString()
            })
            .eq('id', batch.id)

          if (batchError) {
            console.error('Error updating batch:', batchError)
            toast.error('Hiba a gyártási tétel frissítésekor')
          } else {
            toast.success('Gyártási tétel sikeresen befejezve!')
          }
        } catch (batchUpdateError) {
          console.error('Error updating batch status:', batchUpdateError)
          toast.error('Hiba a gyártási tétel frissítésekor')
        }
      }
    } catch (error) {
      console.error('Error completing step:', error)
      toast.error('Hiba a lépés befejezésekor')
    } finally {
      setUpdatingStep(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'skipped': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Várakozik'
      case 'in_progress': return 'Folyamatban'
      case 'completed': return 'Befejezve'
      case 'skipped': return 'Kihagyva'
      default: return status
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Gyártási lépések: {batch.recipe_name || 'Ismeretlen recept'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tétel szám: {batch.batch_number} • Mennyiség: {batch.batch_size} db
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Ingredients Calculator */}
      <div className="mb-6">
        <IngredientCalculator 
          batchId={batch.id}
          batchSize={batch.batch_size}
          recipeId={batch.recipe_id}
          recipeName={batch.recipe_name || 'Ismeretlen recept'}
        />
      </div>
      
      {/* Steps */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">Gyártási folyamat lépései</h4>
        
        {loadingSteps ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : recipeSteps.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
              <p className="text-yellow-800 dark:text-yellow-300">Nincsenek gyártási lépések ehhez a recepthez</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {recipeSteps.map((step, index) => (
              <div 
                key={step.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Step Header */}
                <div 
                  className={`p-4 flex justify-between items-center cursor-pointer ${
                    activeStep === step.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{index + 1}</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">{step.recipe_steps?.title || step.step_id?.title || `Lépés ${index + 1}`}</h5>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                          {getStatusText(step.status)}
                        </span>
                        {(step.recipe_steps?.duration_minutes || step.step_id?.duration_minutes) && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Timer className="h-3 w-3 mr-1" />
                            {step.recipe_steps?.duration_minutes || step.step_id?.duration_minutes} perc
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {step.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startStep(step.id)
                        }}
                        disabled={updatingStep === step.id}
                        className="mr-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingStep === step.id ? 'Indítás...' : 'Indítás'}
                      </button>
                    )}
                    {step.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveStep(step.id)
                        }}
                        disabled={updatingStep === step.id}
                        className="mr-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {updatingStep === step.id ? 'Befejezés...' : 'Befejezés'}
                      </button>
                    )}
                    {activeStep === step.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>
                
                {/* Step Details */}
                {activeStep === step.id && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <div className="space-y-4">
                      {/* Step Description */}
                      {(step.recipe_steps?.description || step.step_id?.description) && (
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Leírás</h6>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{step.recipe_steps?.description || step.step_id?.description}</p>
                        </div>
                      )}
                      
                      {/* Step Parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(step.recipe_steps?.temperature || step.step_id?.temperature) && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center">
                            <Thermometer className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                            <div>
                              <p className="text-xs text-blue-800 dark:text-blue-300">Hőmérséklet</p>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{step.recipe_steps?.temperature || step.step_id?.temperature}°C</p>
                            </div>
                          </div>
                        )}
                        
                        {(step.recipe_steps?.humidity || step.step_id?.humidity) && (
                          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 flex items-center">
                            <Droplets className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mr-2" />
                            <div>
                              <p className="text-xs text-cyan-800 dark:text-cyan-300">Páratartalom</p>
                              <p className="text-sm font-medium text-cyan-900 dark:text-cyan-200">{step.recipe_steps?.humidity || step.step_id?.humidity}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Step Completion Form (only for in_progress steps) */}
                      {step.status === 'in_progress' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Lépés befejezése</h6>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Tényleges hőmérséklet (°C)
                              </label>
                              <input
                                type="number"
                                value={stepData.actual_temperature}
                                onChange={(e) => setStepData(prev => ({ ...prev, actual_temperature: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Tényleges páratartalom (%)
                              </label>
                              <input
                                type="number"
                                value={stepData.actual_humidity}
                                onChange={(e) => setStepData(prev => ({ ...prev, actual_humidity: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Megjegyzések
                              </label>
                              <textarea
                                value={stepData.notes}
                                onChange={(e) => setStepData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            
                            <div className="flex justify-end">
                              <button
                                onClick={() => completeStep(step.id)}
                                disabled={updatingStep === step.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {updatingStep === step.id ? 'Mentés...' : 'Lépés befejezése'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Step Status Info */}
                      {step.status === 'completed' && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                            <div className="flex items-center">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-green-800 dark:text-green-300">Lépés befejezve</p>
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                  {step.end_time ? new Date(step.end_time).toLocaleString('hu-HU') : 'Ismeretlen időpont'}
                                </p>
                              </div>
                            </div>
                            
                            {(step.actual_temperature || step.actual_humidity || step.notes) && (
                              <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                                {step.actual_temperature && (
                                  <p className="text-xs text-green-700 dark:text-green-400">
                                    Hőmérséklet: {step.actual_temperature}°C
                                  </p>
                                )}
                                {step.actual_humidity && (
                                  <p className="text-xs text-green-700 dark:text-green-400">
                                    Páratartalom: {step.actual_humidity}%
                                  </p>
                                )}
                                {step.notes && (
                                  <p className="text-xs text-green-700 dark:text-green-400">
                                    Megjegyzés: {step.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}