import React, { useState, useEffect } from 'react'
import { 
  ChefHat, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  Package,
  Truck,
  FileText,
  QrCode
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import ProductionSteps from '../components/Production/ProductionSteps'
import BarcodeScanner from '../components/Inventory/BarcodeScanner'

interface ProductionBatch {
  id: string
  batch_number: string
  recipe_id: string
  batch_size: number
  status: 'planned' | 'in_progress' | 'completed' | 'failed'
  start_time: string | null
  end_time: string | null
  actual_yield: number | null
  quality_score: number | null
  temperature: number | null
  humidity: number | null
  notes: string | null
  location_id: string | null
  baker_id: string | null
  created_at: string
  updated_at: string
  products?: {
    name: string
    category: string
  }
  locations?: {
    name: string
  }
  profiles?: {
    full_name: string
  }
}

export default function Production() {
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [steps, setSteps] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showStepsModal, setShowStepsModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [bakers, setBakers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    recipe_id: '',
    batch_size: 100,
    baker_id: '',
    notes: ''
  })

  useEffect(() => {
    loadBatches()
    loadProducts()
    loadBakers()
  }, [])

  const loadBatches = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          *,
          products:recipe_id (name, category),
          locations:location_id (name),
          profiles:baker_id (full_name)
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a gyártási tételek betöltésekor')
        return
      }
      
      if (data) {
        setBatches(data)
      }
    } catch (error) {
      console.error('Hiba a gyártási tételek betöltésekor:', error)
      toast.error('Hiba a gyártási tételek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .order('name')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Hiba a termékek betöltésekor:', error)
    }
  }

  const loadBakers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'baker')
        .eq('status', 'active')
        .order('full_name')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setBakers(data)
      }
    } catch (error) {
      console.error('Hiba a pékek betöltésekor:', error)
    }
  }

  const handleCreateBatch = async () => {
    try {
      if (!formData.recipe_id) {
        toast.error('Kérjük válasszon terméket')
        return
      }
      
      // Generate batch number
      const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`
      
      // Create batch data
      const batchData = {
        batch_number: batchNumber,
        recipe_id: formData.recipe_id,
        batch_size: formData.batch_size,
        status: 'planned',
        baker_id: formData.baker_id || null,
        notes: formData.notes || null
      }
      
      // Insert into database
      const { data, error } = await supabase
        .from('production_batches')
        .insert(batchData)
        .select()
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a gyártási tétel létrehozásakor')
        return
      }
      
      toast.success('Gyártási tétel sikeresen létrehozva!')
      setShowAddModal(false)
      resetForm()
      loadBatches()
    } catch (error) {
      console.error('Hiba a gyártási tétel létrehozásakor:', error)
      toast.error('Hiba a gyártási tétel létrehozásakor')
    }
  }

  const resetForm = () => {
    setFormData({
      recipe_id: '',
      batch_size: 100,
      baker_id: '',
      notes: ''
    })
  }

  const handleStartBatch = async (id: string) => {
    try {
      // Update directly in the table instead of using RPC
      const { error } = await supabase
        .from('production_batches')
        .update({ 
          status: 'in_progress',
          start_time: new Date().toISOString(),
          end_time: null
        })
        .eq('id', id)
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a gyártási tétel indításakor')
        return
      }
      
      toast.success('Gyártási tétel sikeresen elindítva!')
      loadBatches()
    } catch (error) {
      console.error('Hiba a gyártási tétel indításakor:', error)
      toast.error('Hiba a gyártási tétel indításakor')
    }
  }

  const handleCompleteBatch = async (id: string) => {
    try {
      // Update directly in the table instead of using RPC
      const { error } = await supabase
        .from('production_batches')
        .update({ 
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a gyártási tétel befejezésekor')
        return
      }
      
      toast.success('Gyártási tétel sikeresen befejezve!')
      loadBatches()
    } catch (error) {
      console.error('Hiba a gyártási tétel befejezésekor:', error)
      toast.error('Hiba a gyártási tétel befejezésekor')
    }
  }

  const handleCancelBatch = async (id: string) => {
    try {
      if (confirm('Biztosan törölni szeretné ezt a gyártási tételt?')) {
        // Update directly in the table instead of using RPC
        const { error } = await supabase
          .from('production_batches')
          .update({ 
            status: 'failed',
            end_time: new Date().toISOString()
          })
          .eq('id', id)
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a gyártási tétel törlésekor')
          return
        }
        
        toast.success('Gyártási tétel sikeresen törölve!')
        loadBatches()
      }
    } catch (error) {
      console.error('Hiba a gyártási tétel törlésekor:', error)
      toast.error('Hiba a gyártási tétel törlésekor')
    }
  }

  const handleGenerateDeliveryNote = async (batchId: string) => {
    try {
      // Get batch details with direct query instead of RPC
      const { data: batchData, error: batchError } = await supabase
        .from('production_batches')
        .select(`
          *,
          products:recipe_id (name, category)
        `)
        .eq('id', batchId)
        .single()
      
      if (batchError) {
        console.error('Error loading batch:', batchError)
        toast.error('Hiba a gyártási tétel betöltésekor')
        return
      }
      
      // Create delivery note
      const deliveryNoteData = {
        order_number: batchData.batch_number,
        batch_id: batchId,
        status: 'pending',
        customer_name: 'Gyártási tétel szállítólevele',
        items: [{
          id: batchData.recipe_id,
          name: batchData.products?.name || 'Ismeretlen termék',
          quantity: batchData.batch_size,
          price: 0
        }],
        location_id: batchData.location_id,
        delivery_date: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('delivery_notes')
        .insert(deliveryNoteData)
        .select()
      
      if (error) {
        console.error('Error creating delivery note:', error)
        toast.error('Hiba a szállítólevél létrehozásakor')
        return
      }
      
      toast.success('Szállítólevél sikeresen létrehozva!')
    } catch (error) {
      console.error('Hiba a szállítólevél létrehozásakor:', error)
      toast.error('Hiba a szállítólevél létrehozásakor')
    }
  }

  const handleScanQrCode = (data: string) => {
    // Implement QR code scanning logic
    toast.success(`QR kód beolvasva: ${data}`);
    setShowScanner(false);
    
    // Check if it's a batch number
    const batchMatch = data.match(/BATCH-\d+/i);
    if (batchMatch) {
      const batchNumber = batchMatch[0];
      // Find batch by batch number
      const batch = batches.find(b => b.batch_number === batchNumber);
      if (batch) {
        handleViewSteps(batch);
      } else {
        toast.error(`Nem található gyártási tétel ezzel az azonosítóval: ${batchNumber}`);
      }
    }
  }

  const handleViewSteps = (batch: ProductionBatch) => {
    setSelectedBatch(batch)
    
    // Lépések betöltése és modal megjelenítése
    loadSteps(batch.id)
      .then(() => {
        // Only show modal after steps are loaded
        setShowStepsModal(true)
      })
      .catch(error => {
        console.error('Error loading steps:', error);
        toast.error('Hiba a lépések betöltésekor');
      });
  }
  
  const loadSteps = async (batchId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('production_steps')
        .select(`
          *,
          recipe_steps(*)
        `)
        .eq('batch_id', batchId)
        .order('id')
      
      if (error) {
        console.error('Error loading steps:', error)
        toast.error('Hiba a gyártási lépések betöltésekor')
        return Promise.reject(error)
      }
      
      if (data && data.length > 0) {
        setSteps(data)
        return Promise.resolve();
      } else {
        // If no steps found, create default steps
        return createDefaultSteps(batchId);
      }
    } catch (error) {
      console.error('Hiba a gyártási lépések betöltésekor:', error)
      toast.error('Hiba a gyártási lépések betöltésekor')
      return Promise.reject(error);
    }
  }
  
  // Function to create default steps if none exist
  const createDefaultSteps = async (batchId: string): Promise<void> => {
    try {
      // Get the recipe ID for this batch
      const { data: batchData, error: batchError } = await supabase
        .from('production_batches')
        .select('recipe_id')
        .eq('id', batchId)
        .single();
        
      if (batchError) {
        console.error('Error fetching batch:', batchError);
        return Promise.reject(batchError);
      }
      
      const recipeId = batchData.recipe_id;
      
      // Check if recipe steps exist
      const { data: recipeSteps, error: stepsError } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('step_number');
        
      if (stepsError) {
        console.error('Error fetching recipe steps:', stepsError);
        return Promise.reject(stepsError);
      }
      
      // If recipe steps exist, create production steps
      if (recipeSteps && recipeSteps.length > 0) {
        const productionSteps = recipeSteps.map(step => ({
          batch_id: batchId,
          step_id: step.id,
          status: 'pending'
        }));
        
        const { error: insertError } = await supabase
          .from('production_steps')
          .insert(productionSteps);
          
        if (insertError) {
          console.error('Error creating production steps:', insertError);
          return Promise.reject(insertError);
        }
        
        // Reload steps after creation
        return loadSteps(batchId);
      } else {
        // Create default recipe steps
        const defaultSteps = [
          {
            recipe_id: recipeId,
            step_number: 1,
            title: 'Előkészítés',
            description: 'Alapanyagok kimérése és előkészítése',
            duration_minutes: 15
          },
          {
            recipe_id: recipeId,
            step_number: 2,
            title: 'Dagasztás',
            description: 'Alapanyagok összekeverése és dagasztása',
            duration_minutes: 20
          },
          {
            recipe_id: recipeId,
            step_number: 3,
            title: 'Kelesztés',
            description: 'Tészta kelesztése',
            duration_minutes: 60,
            temperature: 30,
            humidity: 80
          },
          {
            recipe_id: recipeId,
            step_number: 4,
            title: 'Formázás',
            description: 'Tészta formázása',
            duration_minutes: 15
          },
          {
            recipe_id: recipeId,
            step_number: 5,
            title: 'Sütés',
            description: 'Tészta sütése',
            duration_minutes: 30,
            temperature: 220
          }
        ];
        
        // Insert recipe steps
        const { data: insertedSteps, error: insertStepsError } = await supabase
          .from('recipe_steps')
          .insert(defaultSteps)
          .select();
          
        if (insertStepsError) {
          console.error('Error creating default recipe steps:', insertStepsError);
          return Promise.reject(insertStepsError);
        }
        
        if (insertedSteps) {
          // Create production steps from the inserted recipe steps
          const productionSteps = insertedSteps.map(step => ({
            batch_id: batchId,
            step_id: step.id,
            status: 'pending'
          }));
          
          const { error: insertProdError } = await supabase
            .from('production_steps')
            .insert(productionSteps);
            
          if (insertProdError) {
            console.error('Error creating production steps:', insertProdError);
            return Promise.reject(insertProdError);
          }
          
          // Reload steps after creation
          return loadSteps(batchId);
        }
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error creating default steps:', error);
      toast.error('Hiba az alapértelmezett lépések létrehozásakor: ' + (error as Error).message);
      return Promise.reject(error);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'in_progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planned': return 'Tervezett'
      case 'in_progress': return 'Folyamatban'
      case 'completed': return 'Befejezve'
      case 'failed': return 'Sikertelen'
      default: return status
    }
  }

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      (batch.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (batch.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (batch.locations?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (batch.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <ChefHat className="h-8 w-8 mr-3 text-amber-600" />
            Termelés
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gyártási tételek kezelése és nyomon követése
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            QR kód olvasása
          </button>
          <button
            onClick={loadBatches}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg shadow-amber-500/25"
          >
            <Plus className="h-5 w-5 mr-2" />
            Új gyártási tétel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Keresés
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tétel szám, termék, helyszín vagy pék neve..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Állapot
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Összes állapot</option>
              <option value="planned">Tervezett</option>
              <option value="in_progress">Folyamatban</option>
              <option value="completed">Befejezve</option>
              <option value="failed">Sikertelen</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batches */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tétel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Termék
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Mennyiség
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Állapot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Helyszín
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pék
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Nincsenek gyártási tételek
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {batch.batch_number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(batch.created_at).toLocaleDateString('hu-HU')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {batch.products?.name || 'Ismeretlen termék'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {batch.products?.category || 'Ismeretlen kategória'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {batch.batch_size} db
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                        {getStatusText(batch.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {batch.locations?.name || 'Nincs megadva'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {batch.profiles?.full_name || 'Nincs megadva'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewSteps(batch)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Lépések"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {batch.status === 'planned' && (
                          <button
                            onClick={() => handleStartBatch(batch.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Indítás"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        )}
                        {batch.status === 'in_progress' && (
                          <button
                            onClick={() => handleCompleteBatch(batch.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Befejezés"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {batch.status === 'completed' && (
                          <button
                            onClick={() => handleGenerateDeliveryNote(batch.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Szállítólevél"
                          >
                            <Truck className="h-4 w-4" />
                          </button>
                        )}
                        {(batch.status === 'planned' || batch.status === 'in_progress') && (
                          <button
                            onClick={() => handleCancelBatch(batch.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Törlés"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Új gyártási tétel
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Termék
                </label>
                <select
                  value={formData.recipe_id}
                  onChange={(e) => setFormData({ ...formData, recipe_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Válasszon terméket</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mennyiség (db)
                </label>
                <input
                  type="number"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pék
                </label>
                <select
                  value={formData.baker_id}
                  onChange={(e) => setFormData({ ...formData, baker_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Válasszon péket</option>
                  {bakers.map((baker) => (
                    <option key={baker.id} value={baker.id}>
                      {baker.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Megjegyzések
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Mégse
              </button>
              <button
                onClick={handleCreateBatch}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700"
              >
                Létrehozás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps Modal */}
      {showStepsModal && selectedBatch && (
        <ProductionSteps
          batch={selectedBatch}
          steps={steps}
          loading={false}
          onClose={() => setShowStepsModal(false)}
          onStepUpdate={() => loadSteps(selectedBatch.id)}
        />
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                QR kód olvasása
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <BarcodeScanner
              onScan={handleScanQrCode}
              onError={(error) => {
                console.error('Scanner error:', error);
                toast.error('Hiba a QR kód olvasásakor');
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}