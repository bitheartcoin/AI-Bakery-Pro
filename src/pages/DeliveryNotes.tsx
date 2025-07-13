import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter, 
  Save, 
  X, 
  Truck,
  Package,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Printer,
  Eye
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface DeliveryNote {
  id: string
  order_id: string | null
  order_number: string
  batch_id: string | null
  status: 'pending' | 'in_progress' | 'delivered' | 'cancelled'
  driver_id: string | null
  driver_name?: string
  vehicle_id: string | null
  vehicle_name?: string
  customer_name: string
  customer_address: string | null
  items: any[]
  created_at: string
  updated_at: string
  delivery_date: string | null
  notes: string | null
}

interface Vehicle {
  id: string
  license_plate: string
  model: string
}

interface Driver {
  id: string
  name: string
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_address: string | null
  items: any[]
}

interface Batch {
  id: string
  batch_number: string
  recipe_name: string
}

export default function DeliveryNotes() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingNote, setEditingNote] = useState<DeliveryNote | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [formData, setFormData] = useState({
    order_id: '',
    order_number: '',
    batch_id: '',
    status: 'pending' as DeliveryNote['status'],
    driver_id: '',
    vehicle_id: '',
    customer_name: '',
    customer_address: '',
    items: [],
    delivery_date: '',
    notes: ''
  })

  useEffect(() => {
    loadDeliveryNotes()
    loadVehicles()
    loadDrivers()
    loadOrders()
    loadBatches()
  }, [])

  const loadDeliveryNotes = async () => {
    try {
      setLoading(true)
      
      // Load delivery notes from database
      const { data, error } = await supabase
        .from('delivery_notes')
        .select(`
          *,
          profiles:driver_id (id, full_name),
          vehicles:vehicle_id (id, license_plate, model)
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a szállítólevelek betöltésekor')
        return
      }
      
      if (data) {
        // Format data
        const formattedNotes: DeliveryNote[] = data.map(note => ({
          ...note,
          driver_name: note.profiles?.full_name,
          vehicle_name: note.vehicles ? `${note.vehicles.model} (${note.vehicles.license_plate})` : undefined
        }))
        
        setDeliveryNotes(formattedNotes)
      }
    } catch (error) {
      console.error('Hiba a szállítólevelek betöltésekor:', error)
      toast.error('Hiba a szállítólevelek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, model')
        .eq('status', 'active')
        .order('license_plate')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setVehicles(data)
      }
    } catch (error) {
      console.error('Hiba a járművek betöltésekor:', error)
    }
  }

  const loadDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'driver')
        .order('full_name')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setDrivers(data.map(driver => ({
          id: driver.id,
          name: driver.full_name
        })))
      }
    } catch (error) {
      console.error('Hiba a sofőrök betöltésekor:', error)
    }
  }

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, items')
        .in('status', ['confirmed', 'in_production', 'ready'])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setOrders(data)
      }
    } catch (error) {
      console.error('Hiba a rendelések betöltésekor:', error)
    }
  }

  const loadBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          id, 
          batch_number,
          recipes:recipe_id (id, name)
        `)
        .in('status', ['completed', 'in_progress'])
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setBatches(data.map(batch => ({
          id: batch.id,
          batch_number: batch.batch_number,
          recipe_name: batch.recipes?.name || 'Ismeretlen recept'
        })))
      }
    } catch (error) {
      console.error('Hiba a gyártási tételek betöltésekor:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // Generate order number if not provided
      const orderNumber = formData.order_number || `SZL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      
      if (editingNote) {
        // Update existing note
        const updatedNote = {
          ...editingNote,
          order_id: formData.order_id || null,
          order_number: orderNumber,
          batch_id: formData.batch_id || null,
          status: formData.status,
          driver_id: formData.driver_id || null,
          vehicle_id: formData.vehicle_id || null,
          customer_name: formData.customer_name,
          customer_address: formData.customer_address || null,
          items: formData.items,
          delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        }
        
        // Update in database
        const { error } = await supabase
          .from('delivery_notes')
          .update(updatedNote)
          .eq('id', editingNote.id)
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a szállítólevél frissítésekor')
          return
        }
        
        // Update driver and vehicle names
        const driver = drivers.find(d => d.id === formData.driver_id)
        const vehicle = vehicles.find(v => v.id === formData.vehicle_id)
        
        updatedNote.driver_name = driver?.name
        updatedNote.vehicle_name = vehicle ? `${vehicle.model} (${vehicle.license_plate})` : undefined
        
        // Update local state
        setDeliveryNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n))
        toast.success('Szállítólevél sikeresen frissítve!')
      } else {
        // Create new note
        const newNote: Partial<DeliveryNote> = {
          order_id: formData.order_id || null,
          order_number: orderNumber,
          batch_id: formData.batch_id || null,
          status: formData.status,
          driver_id: formData.driver_id || null,
          vehicle_id: formData.vehicle_id || null,
          customer_name: formData.customer_name,
          customer_address: formData.customer_address || null,
          items: formData.items,
          delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
          notes: formData.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Insert into database
        const { data, error } = await supabase
          .from('delivery_notes')
          .insert(newNote)
          .select()
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a szállítólevél létrehozásakor')
          return
        }
        
        if (data && data.length > 0) {
          // Get driver and vehicle names
          const driver = drivers.find(d => d.id === formData.driver_id)
          const vehicle = vehicles.find(v => v.id === formData.vehicle_id)
          
          const createdNote: DeliveryNote = {
            ...data[0],
            driver_name: driver?.name,
            vehicle_name: vehicle ? `${vehicle.model} (${vehicle.license_plate})` : undefined
          }
          
          // Update local state
          setDeliveryNotes(prev => [createdNote, ...prev])
          toast.success('Új szállítólevél sikeresen létrehozva!')
        }
      }
      
      setShowAddModal(false)
      setEditingNote(null)
      resetForm()
    } catch (error) {
      console.error('Hiba a szállítólevél mentésekor:', error)
      toast.error('Hiba történt a szállítólevél mentésekor!')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      order_id: '',
      order_number: '',
      batch_id: '',
      status: 'pending',
      driver_id: '',
      vehicle_id: '',
      customer_name: '',
      customer_address: '',
      items: [],
      delivery_date: '',
      notes: ''
    })
  }

  const editNote = (note: DeliveryNote) => {
    setEditingNote(note)
    setFormData({
      order_id: note.order_id || '',
      order_number: note.order_number,
      batch_id: note.batch_id || '',
      status: note.status,
      driver_id: note.driver_id || '',
      vehicle_id: note.vehicle_id || '',
      customer_name: note.customer_name,
      customer_address: note.customer_address || '',
      items: note.items,
      delivery_date: note.delivery_date ? new Date(note.delivery_date).toISOString().split('T')[0] : '',
      notes: note.notes || ''
    })
    setShowAddModal(true)
  }

  const deleteNote = async (id: string) => {
    if (window.confirm('Biztosan törölni szeretné ezt a szállítólevelet?')) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('delivery_notes')
          .delete()
          .eq('id', id)
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a szállítólevél törlésekor')
          return
        }
        
        // Update local state
        setDeliveryNotes(prev => prev.filter(n => n.id !== id))
        toast.success('Szállítólevél sikeresen törölve!')
      } catch (error) {
        console.error('Hiba a szállítólevél törlésekor:', error)
        toast.error('Hiba történt a szállítólevél törlésekor!')
      }
    }
  }

  const updateNoteStatus = async (id: string, status: DeliveryNote['status']) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('delivery_notes')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a szállítólevél állapotának frissítésekor')
        return
      }
      
      // Update local state
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === id) {
          return { ...n, status, updated_at: new Date().toISOString() }
        }
        return n
      }))
      toast.success(`Szállítólevél állapota frissítve: ${getStatusText(status)}`)
    } catch (error) {
      console.error('Hiba a szállítólevél állapotának frissítésekor:', error)
      toast.error('Hiba történt a szállítólevél állapotának frissítésekor!')
    }
  }

  const handleOrderSelect = (orderId: string) => {
    const selectedOrder = orders.find(o => o.id === orderId)
    if (selectedOrder) {
      setFormData(prev => ({
        ...prev,
        order_id: selectedOrder.id,
        order_number: selectedOrder.order_number,
        customer_name: selectedOrder.customer_name,
        customer_address: selectedOrder.customer_address || '',
        items: selectedOrder.items
      }))
    }
  }

  const handleViewNote = (note: DeliveryNote) => {
    setSelectedNote(note);
    setShowViewModal(true);
  }

  const handlePrint = () => {
    if (!selectedNote) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup ablak blokkolva van. Kérjük, engedélyezze a felugró ablakokat.');
      return;
    }
    
    // Generate HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Szállítólevél - ${selectedNote.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .title { font-size: 20px; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .info-section { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { width: 150px; font-weight: bold; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 45%; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Szemesi Pékség</div>
          <div class="title">SZÁLLÍTÓLEVÉL</div>
          <div class="subtitle">Szállítólevél száma: ${selectedNote.order_number}</div>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Dátum:</div>
            <div class="info-value">${new Date(selectedNote.created_at).toLocaleDateString('hu-HU')}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Szállítási dátum:</div>
            <div class="info-value">${selectedNote.delivery_date ? new Date(selectedNote.delivery_date).toLocaleDateString('hu-HU') : 'Nincs megadva'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Állapot:</div>
            <div class="info-value">${getStatusText(selectedNote.status)}</div>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Ügyfél neve:</div>
            <div class="info-value">${selectedNote.customer_name}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Szállítási cím:</div>
            <div class="info-value">${selectedNote.customer_address || 'Nincs megadva'}</div>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Sofőr:</div>
            <div class="info-value">${selectedNote.driver_name || 'Nincs kijelölve'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Jármű:</div>
            <div class="info-value">${selectedNote.vehicle_name || 'Nincs kijelölve'}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Termék</th>
              <th>Mennyiség</th>
              <th>Egységár</th>
              <th>Összesen</th>
            </tr>
          </thead>
          <tbody>
            ${selectedNote.items.map(item => `
              <tr>
                <td>${item.name || item.product_name}</td>
                <td>${item.quantity} db</td>
                <td>${(item.price || 0).toLocaleString('hu-HU')} Ft</td>
                <td>${((item.price || 0) * item.quantity).toLocaleString('hu-HU')} Ft</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${selectedNote.notes ? `
        <div class="info-section">
          <div class="info-row">
            <div class="info-label">Megjegyzések:</div>
            <div class="info-value">${selectedNote.notes}</div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <div class="signature">Átadó aláírása</div>
          <div class="signature">Átvevő aláírása</div>
        </div>
        
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer;">Nyomtatás</button>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Trigger print when content is loaded
    printWindow.onload = function() {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Függőben'
      case 'in_progress': return 'Szállítás alatt'
      case 'delivered': return 'Kézbesítve'
      case 'cancelled': return 'Törölve'
      default: return status
    }
  }

  // Filter delivery notes
  const filteredNotes = deliveryNotes.filter(note => {
    const matchesSearch = 
      note.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.customer_address && note.customer_address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.driver_name && note.driver_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = selectedStatus === 'all' || note.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const stats = {
    total: deliveryNotes.length,
    pending: deliveryNotes.filter(n => n.status === 'pending').length,
    inProgress: deliveryNotes.filter(n => n.status === 'in_progress').length,
    delivered: deliveryNotes.filter(n => n.status === 'delivered').length,
    cancelled: deliveryNotes.filter(n => n.status === 'cancelled').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <FileText className="h-8 w-8 mr-3 text-blue-600" />
            Szállítólevelek
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Szállítólevelek kezelése és nyomon követése
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadDeliveryNotes}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Frissítés
          </button>
          <button
            onClick={() => {
              resetForm()
              setEditingNote(null)
              setShowAddModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Plus className="h-5 w-5 mr-2" />
            Új szállítólevél
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Összes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 p-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Függőben</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-3">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Szállítás alatt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kézbesítve</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.delivered}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="rounded-xl bg-gradient-to-br from-red-500 to-pink-600 p-3">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Törölve</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cancelled}</p>
            </div>
          </div>
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
                placeholder="Szállítólevél száma, ügyfél neve vagy címe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Állapot
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Összes állapot</option>
              <option value="pending">Függőben</option>
              <option value="in_progress">Szállítás alatt</option>
              <option value="delivered">Kézbesítve</option>
              <option value="cancelled">Törölve</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delivery Notes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Szállítólevél
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ügyfél
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sofőr / Jármű
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Állapot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Szállítási dátum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {note.order_number}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(note.created_at).toLocaleDateString('hu-HU')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {note.customer_name}
                    </div>
                    {note.customer_address && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {note.customer_address}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {note.driver_name || 'Nincs kijelölve'}
                    </div>
                    {note.vehicle_name && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {note.vehicle_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {note.delivery_date ? format(new Date(note.delivery_date), 'yyyy. MMMM d.', { locale: hu }) : 'Nincs megadva'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleViewNote(note)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Megtekintés"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => editNote(note)}
                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                        title="Szerkesztés"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => toast.info(`Szállítólevél nyomtatása: ${note.order_number}`)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => toast.success(`Számla létrehozva a ${note.order_number} szállítólevélhez`)}
                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => deleteNote(note.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nincsenek szállítólevelek</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kezdje el új szállítólevél hozzáadásával.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  resetForm()
                  setEditingNote(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Új szállítólevél
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Delivery Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingNote ? 'Szállítólevél szerkesztése' : 'Új szállítólevél'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bal oldal - Alapadatok */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Alapadatok</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rendelés
                    </label>
                    <select
                      value={formData.order_id}
                      onChange={(e) => handleOrderSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Válasszon rendelést</option>
                      {orders.map(order => (
                        <option key={order.id} value={order.id}>
                          {order.order_number} - {order.customer_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Szállítólevél száma
                    </label>
                    <input
                      type="text"
                      value={formData.order_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Automatikusan generálva, ha üresen hagyja"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gyártási tétel
                    </label>
                    <select
                      value={formData.batch_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, batch_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Válasszon gyártási tételt</option>
                      {batches.map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_number} - {batch.recipe_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Állapot *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as DeliveryNote['status'] }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="pending">Függőben</option>
                      <option value="in_progress">Szállítás alatt</option>
                      <option value="delivered">Kézbesítve</option>
                      <option value="cancelled">Törölve</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Szállítási dátum
                    </label>
                    <input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Jobb oldal - Részletek */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Részletek</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ügyfél neve *
                    </label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Szállítási cím
                    </label>
                    <input
                      type="text"
                      value={formData.customer_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sofőr
                    </label>
                    <select
                      value={formData.driver_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Válasszon sofőrt</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Jármű
                    </label>
                    <select
                      value={formData.vehicle_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Válasszon járművet</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.model} ({vehicle.license_plate})
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
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.customer_name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Mentés...' : editingNote ? 'Frissítés' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* View Delivery Note Modal */}
      {showViewModal && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Szállítólevél: {selectedNote.order_number}
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Szállítási adatok</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Szállítólevél száma:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedNote.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Létrehozva:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedNote.created_at).toLocaleDateString('hu-HU')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Szállítási dátum:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedNote.delivery_date ? new Date(selectedNote.delivery_date).toLocaleDateString('hu-HU') : 'Nincs megadva'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Állapot:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedNote.status)}`}>
                        {getStatusText(selectedNote.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ügyfél adatok</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Név:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedNote.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cím:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedNote.customer_address || 'Nincs megadva'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Sofőr:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedNote.driver_name || 'Nincs kijelölve'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Jármű:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedNote.vehicle_name || 'Nincs kijelölve'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Termékek</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Termék
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Mennyiség
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Egységár
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Összesen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedNote.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.name || item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                            {item.quantity} db
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                            {(item.price || 0).toLocaleString('hu-HU')} Ft
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                            {((item.price || 0) * item.quantity).toLocaleString('hu-HU')} Ft
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {selectedNote.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Megjegyzések</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedNote.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Nyomtatás
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Bezárás
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}