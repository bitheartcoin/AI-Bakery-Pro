import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Edit, Trash2, Eye, Package, AlertTriangle, CheckCircle, Scan, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BarcodeScanner from '../components/Inventory/BarcodeScanner'
import BarcodeGenerator from '../components/Inventory/BarcodeGenerator'

interface InventoryItem {
  id: string
  name: string
  category: string
  current_stock: number
  unit: string
  min_threshold: number
  max_threshold?: number
  cost_per_unit: number
  supplier?: string
  supplier_contact?: string
  supplier_email?: string
  last_restocked?: string
  expiry_date?: string
  location_id?: string
  barcode?: string
  qr_code?: string
  created_at: string
  updated_at: string
}

interface Location {
  id: string
  name: string
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [generatorType, setGeneratorType] = useState<'barcode' | 'qr'>('barcode')
  const [generatorValue, setGeneratorValue] = useState('')
  const [selectedItemForCode, setSelectedItemForCode] = useState<InventoryItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    current_stock: '',
    unit: 'kg',
    min_threshold: '',
    max_threshold: '',
    cost_per_unit: '',
    supplier: '',
    supplier_contact: '',
    supplier_email: '',
    expiry_date: '',
    location_id: ''
  })

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('category')
        .order('category')
      
      if (error) throw error
      
      const uniqueCategories = [...new Set(data?.map(item => item.category) || [])]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .in('type', ['store', 'production'])
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const loadInventory = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name')
      
      if (error) throw error
      setInventory(data || [])
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
    loadCategories()
    loadLocations()
  }, [])

  const handleAddItem = async () => {
    try {
      const { error } = await supabase
        .from('inventory')
        .insert([{
          ...formData,
          current_stock: parseFloat(formData.current_stock) || 0,
          min_threshold: parseFloat(formData.min_threshold) || 0,
          max_threshold: formData.max_threshold ? parseFloat(formData.max_threshold) : null,
          cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
          location_id: formData.location_id || null
        }])

      if (error) throw error

      await loadInventory()
      await loadCategories()
      toast.success('Tétel sikeresen hozzáadva!')
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Hiba a tétel hozzáadásakor')
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          ...formData,
          current_stock: parseFloat(formData.current_stock) || 0,
          min_threshold: parseFloat(formData.min_threshold) || 0,
          max_threshold: formData.max_threshold ? parseFloat(formData.max_threshold) : null,
          cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
          location_id: formData.location_id || null
        })
        .eq('id', editingItem.id)

      if (error) throw error

      await loadInventory()
      await loadCategories()
      toast.success('Tétel sikeresen frissítve!')
      setShowModal(false)
      setEditingItem(null)
      resetForm()
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Hiba a tétel frissítésekor')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a tételt?')) return

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Tétel sikeresen törölve!')
      await loadInventory()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Hiba a tétel törlésekor')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      current_stock: '',
      unit: 'kg',
      min_threshold: '',
      max_threshold: '',
      cost_per_unit: '',
      supplier: '',
      supplier_contact: '',
      supplier_email: '',
      expiry_date: '',
      location_id: ''
    })
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      current_stock: item.current_stock.toString(),
      unit: item.unit,
      min_threshold: item.min_threshold.toString(),
      max_threshold: item.max_threshold?.toString() || '',
      cost_per_unit: item.cost_per_unit.toString(),
      supplier: item.supplier || '',
      supplier_contact: item.supplier_contact || '',
      supplier_email: item.supplier_email || '',
      expiry_date: item.expiry_date || '',
      location_id: item.location_id || ''
    })
    setShowModal(true)
  }

  const openViewModal = (item: InventoryItem) => {
    setViewingItem(item)
    setShowViewModal(true)
  }

  const handleBarcodeScanned = (code: string) => {
    const item = inventory.find(item => item.barcode === code || item.qr_code === code)
    if (item) {
      openViewModal(item)
      toast.success('Tétel megtalálva!')
    } else {
      toast.error('Nem található tétel ezzel a kóddal')
    }
    setShowScanner(false)
  }

  const generateAndAssignCode = async (item: InventoryItem, type: 'barcode' | 'qr') => {
    try {
      setSelectedItemForCode(item);
      
      // Generate a unique code
      let code;
      if (type === 'barcode') {
        code = `BAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      } else {
        // Create a JSON object for QR code with more information
        const qrData = {
          id: item.id,
          name: item.name,
          type: 'inventory',
          timestamp: new Date().toISOString()
        };
        code = JSON.stringify(qrData);
      }
      
      // Update the item in the database
      const updateData = type === 'barcode' 
        ? { barcode: code }
        : { qr_code: code };
        
      const { error } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('id', item.id);
        
      if (error) throw error;
      
      // Set the generator value and show the generator
      setGeneratorValue(code);
      setGeneratorType(type);
      setShowGenerator(true);
      
      // Reload inventory to get updated data
      loadInventory();
      
      toast.success(`${type === 'barcode' ? 'Vonalkód' : 'QR kód'} sikeresen generálva!`);
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('Hiba a kód generálásakor');
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= 0) return 'out'
    if (item.current_stock <= item.min_threshold) return 'low'
    return 'good'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out': return 'text-red-600'
      case 'low': return 'text-amber-600'
      default: return 'text-green-600'
    }
  }

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'out': return <AlertTriangle className="w-4 h-4" />
      case 'low': return <AlertTriangle className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    const matchesLocation = !selectedLocation || item.location_id === selectedLocation
    
    return matchesSearch && matchesCategory && matchesLocation
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" />
            Készletkezelés
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Alapanyagok és készletek kezelése
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <Scan className="w-4 h-4" />
            Szkennelés
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Új tétel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Keresés..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">Minden kategória</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="">Minden helyszín</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>

        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
          <Package className="w-4 h-4 mr-1" />
          {filteredInventory.length} tétel
        </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Termék
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Kategória
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Készlet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Egység
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Állapot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Beszállító
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Egységár
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.current_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1 ${getStockStatusColor(status)}`}>
                        {getStockStatusIcon(status)}
                        <span className="text-sm font-medium">
                          {status === 'out' ? 'Elfogyott' : status === 'low' ? 'Alacsony' : 'Megfelelő'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.cost_per_unit} Ft
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openViewModal(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generateAndAssignCode(item, 'barcode')}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Vonalkód generálása"
                        >
                          <Scan className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generateAndAssignCode(item, 'qr')}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          title="QR kód generálása"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingItem ? 'Tétel szerkesztése' : 'Új tétel hozzáadása'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Termék neve *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kategória *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jelenlegi készlet *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_stock: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Egység *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="kg">kg</option>
                    <option value="l">l</option>
                    <option value="db">db</option>
                    <option value="csomag">csomag</option>
                    <option value="doboz">doboz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum küszöb *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_threshold: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maximum küszöb
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.max_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_threshold: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beszállító
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beszállító kapcsolat
                  </label>
                  <input
                    type="text"
                    value={formData.supplier_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beszállító email
                  </label>
                  <input
                    type="email"
                    value={formData.supplier_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Egységár (Ft)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lejárati dátum
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Helyszín
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Válassz helyszínt</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setGeneratorType('barcode')
                    setShowGenerator(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Package className="w-4 h-4" />
                  Vonalkód
                </button>
                <button
                  onClick={() => {
                    setGeneratorType('qr')
                    setShowGenerator(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <QrCode className="w-4 h-4" />
                  QR kód
                </button>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Mégse
                </button>
                <button
                  onClick={editingItem ? handleUpdateItem : handleAddItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {editingItem ? 'Frissítés' : 'Hozzáadás'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Tétel részletei
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Termék neve
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingItem.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kategória
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingItem.category}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Jelenlegi készlet
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingItem.current_stock} {viewingItem.unit}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum küszöb
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingItem.min_threshold} {viewingItem.unit}</p>
                </div>

                {viewingItem.max_threshold && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum küszöb
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingItem.max_threshold} {viewingItem.unit}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Egységár
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingItem.cost_per_unit} Ft</p>
                </div>

                {viewingItem.supplier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Beszállító
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingItem.supplier}</p>
                  </div>
                )}

                {viewingItem.supplier_contact && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Beszállító kapcsolat
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingItem.supplier_contact}</p>
                  </div>
                )}

                {viewingItem.supplier_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Beszállító email
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingItem.supplier_email}</p>
                  </div>
                )}

                {viewingItem.expiry_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lejárati dátum
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(viewingItem.expiry_date).toLocaleDateString('hu-HU')}</p>
                  </div>
                )}

                {viewingItem.last_restocked && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Utolsó feltöltés
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(viewingItem.last_restocked).toLocaleDateString('hu-HU')}</p>
                  </div>
                )}

                {viewingItem.barcode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vonalkód
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{viewingItem.barcode}</p>
                  </div>
                )}

                {viewingItem.qr_code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      QR kód
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{viewingItem.qr_code}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Bezárás
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    openEditModal(viewingItem)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Szerkesztés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(data, type) => handleBarcodeScanned(data)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showGenerator && (
        <BarcodeGenerator
          value={generatorValue}
          type={generatorType}
          inventoryId={selectedItemForCode?.id}
          onClose={() => setShowGenerator(false)}
          onSaved={() => {
            loadInventory();
            setShowGenerator(false);
          }}
        />
      )}
    </div>
  )
}