import React, { useState, useEffect, useRef } from 'react'
import { Truck, Plus, Search, Edit, Trash2, Filter, Calendar, Clock, MapPin, AlertTriangle, CheckCircle, X, Camera, Save, User, FileText, Upload, Map, Navigation, Route as RouteIcon, Fuel, PenTool as Tool, Wrench, BarChart3, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { gpsTracker, VehicleLocation } from '../lib/gpsTracking'
import { useAuth } from '../contexts/AuthContext'

interface Vehicle {
  id: string
  license_plate: string
  type: string
  model: string
  year: number | null
  capacity: number | null
  fuel_type: string
  fuel_consumption: number | null
  insurance_expiry: string | null
  technical_inspection: string | null
  mileage: number
  status: 'active' | 'maintenance' | 'inactive'
  driver_id: string | null
  gps_tracker_id: string | null
  last_service: string | null
  next_service: string | null
  location_id: string | null
  image_url: string | null
}

interface DamageReport {
  id: string
  vehicle_id: string
  report_date: string
  description: string
  location: string
  reporter_id: string
  status: 'reported' | 'in_review' | 'approved' | 'rejected' | 'fixed'
  images: string[]
  created_at: string
}

interface Driver {
  id: string
  name: string
  email?: string
  phone?: string
  license_number?: string
  license_expiry?: string
}

interface Location {
  id: string
  name: string
  address?: string
  city?: string
}

export default function Fleet() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [damageReports, setDamageReports] = useState<DamageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [showDamageModal, setShowDamageModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [vehicleLocation, setVehicleLocation] = useState<VehicleLocation | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [damageImageFiles, setDamageImageFiles] = useState<File[]>([])
  const [damageImagePreviews, setDamageImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const damageFileInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  
  const [vehicleFormData, setVehicleFormData] = useState({
    license_plate: '',
    type: 'truck',
    model: '',
    year: '',
    capacity: '',
    fuel_type: 'diesel',
    fuel_consumption: '',
    insurance_expiry: '',
    technical_inspection: '',
    mileage: '',
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    driver_id: '',
    gps_tracker_id: '',
    last_service: '',
    next_service: '',
    location_id: ''
  })
  
  const [damageFormData, setDamageFormData] = useState({
    vehicle_id: '',
    description: '',
    location: '',
    status: 'reported' as 'reported' | 'in_review' | 'approved' | 'rejected' | 'fixed'
  })

  useEffect(() => {
    loadVehicles()
    loadDrivers()
    loadLocations()
    loadDamageReports()
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      
      // Load vehicles from database
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles:driver_id (id, full_name, email, phone),
          locations:location_id (id, name, address, city)
        `)
        .order('license_plate')
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a járművek betöltésekor')
        return
      }
      
      if (data) {
        setVehicles(data)
        
        // If there's a selected vehicle, update it with the new data
        if (selectedVehicle) {
          const updatedVehicle = data.find(v => v.id === selectedVehicle.id)
          if (updatedVehicle) {
            setSelectedVehicle(updatedVehicle)
          }
        }
      }
    } catch (error) {
      console.error('Hiba a járművek betöltésekor:', error)
      toast.error('Hiba a járművek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadDrivers = async () => {
    try {
      // Load drivers from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .eq('role', 'driver')
        .eq('status', 'active')
        .order('full_name')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setDrivers(data.map(driver => ({
          id: driver.id,
          name: driver.full_name,
          email: driver.email,
          phone: driver.phone
        })))
      }
    } catch (error) {
      console.error('Hiba a sofőrök betöltésekor:', error)
    }
  }

  const loadLocations = async () => {
    try {
      // Load locations from database
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, city')
        .eq('status', 'active')
        .order('name')
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setLocations(data)
      }
    } catch (error) {
      console.error('Hiba a helyszínek betöltésekor:', error)
    }
  }

  const loadDamageReports = async () => {
    try {
      // Load damage reports from database
      const { data, error } = await supabase
        .from('vehicle_damage_reports')
        .select(`
          *,
          profiles:reporter_id (id, full_name),
          vehicles:vehicle_id (id, license_plate, model)
        `)
        .order('report_date', { ascending: false })
      
      if (error) {
        console.error('Database error:', error)
        return
      }
      
      if (data) {
        setDamageReports(data)
      }
    } catch (error) {
      console.error('Hiba a kárjelentések betöltésekor:', error)
    }
  }

  const handleVehicleSubmit = async () => {
    try {
      setLoading(true)
      
      // Validate form data
      if (!vehicleFormData.license_plate || !vehicleFormData.model) {
        toast.error('Kérjük töltse ki a kötelező mezőket')
        return
      }
      
      // Upload image if selected
      let imageUrl = editingVehicle?.image_url || null
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `vehicles/${fileName}`
        
        // Convert image to base64
        const reader = new FileReader()
        reader.readAsDataURL(imageFile)
        
        const base64Image = await new Promise<string>((resolve) => {
          reader.onload = () => {
            resolve(reader.result as string)
          }
        })
        
        imageUrl = base64Image
      }
      
      // Prepare vehicle data
      const vehicleData = {
        license_plate: vehicleFormData.license_plate,
        type: vehicleFormData.type,
        model: vehicleFormData.model,
        year: vehicleFormData.year ? parseInt(vehicleFormData.year) : null,
        capacity: vehicleFormData.capacity ? parseFloat(vehicleFormData.capacity) : null,
        fuel_type: vehicleFormData.fuel_type,
        fuel_consumption: vehicleFormData.fuel_consumption ? parseFloat(vehicleFormData.fuel_consumption) : null,
        insurance_expiry: vehicleFormData.insurance_expiry || null,
        technical_inspection: vehicleFormData.technical_inspection || null,
        mileage: vehicleFormData.mileage ? parseInt(vehicleFormData.mileage) : 0,
        status: vehicleFormData.status,
        driver_id: vehicleFormData.driver_id || null,
        gps_tracker_id: vehicleFormData.gps_tracker_id || null,
        last_service: vehicleFormData.last_service || null,
        next_service: vehicleFormData.next_service || null,
        location_id: vehicleFormData.location_id || null,
        image_url: imageUrl
      }
      
      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id)
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a jármű frissítésekor')
          return
        }
        
        toast.success('Jármű sikeresen frissítve!')
      } else {
        // Create new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert(vehicleData)
        
        if (error) {
          console.error('Database error:', error)
          toast.error('Hiba a jármű létrehozásakor')
          return
        }
        
        toast.success('Jármű sikeresen létrehozva!')
      }
      
      // Reload vehicles and reset form
      loadVehicles()
      resetVehicleForm()
      setShowVehicleModal(false)
      setEditingVehicle(null)
      setImageFile(null)
      setImagePreview(null)
    } catch (error) {
      console.error('Hiba a jármű mentésekor:', error)
      toast.error('Hiba a jármű mentésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleDamageSubmit = async () => {
    try {
      setLoading(true)
      
      // Validate form data
      if (!damageFormData.vehicle_id || !damageFormData.description || !damageFormData.location) {
        toast.error('Kérjük töltse ki a kötelező mezőket')
        return
      }
      
      // Upload images if selected
      const imageUrls: string[] = []
      
      for (const file of damageImageFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${imageUrls.length}.${fileExt}`
        const filePath = `damage_reports/${fileName}`
        
        // Convert image to base64
        const reader = new FileReader()
        reader.readAsDataURL(file)
        
        const base64Image = await new Promise<string>((resolve) => {
          reader.onload = () => {
            resolve(reader.result as string)
          }
        })
        
        imageUrls.push(base64Image)
      }
      
      // Prepare damage report data
      const damageData = {
        vehicle_id: damageFormData.vehicle_id,
        report_date: new Date().toISOString().split('T')[0],
        description: damageFormData.description,
        location: damageFormData.location,
        reporter_id: user?.id,
        status: damageFormData.status,
        images: imageUrls
      }
      
      // Create new damage report
      const { error } = await supabase
        .from('vehicle_damage_reports')
        .insert(damageData)
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a kárjelentés létrehozásakor')
        return
      }
      
      toast.success('Kárjelentés sikeresen létrehozva!')
      
      // Reload damage reports and reset form
      loadDamageReports()
      resetDamageForm()
      setShowDamageModal(false)
      setDamageImageFiles([])
      setDamageImagePreviews([])
    } catch (error) {
      console.error('Hiba a kárjelentés mentésekor:', error)
      toast.error('Hiba a kárjelentés mentésekor')
    } finally {
      setLoading(false)
    }
  }

  const resetVehicleForm = () => {
    setVehicleFormData({
      license_plate: '',
      type: 'truck',
      model: '',
      year: '',
      capacity: '',
      fuel_type: 'diesel',
      fuel_consumption: '',
      insurance_expiry: '',
      technical_inspection: '',
      mileage: '',
      status: 'active',
      driver_id: '',
      gps_tracker_id: '',
      last_service: '',
      next_service: '',
      location_id: ''
    })
  }

  const resetDamageForm = () => {
    setDamageFormData({
      vehicle_id: selectedVehicle?.id || '',
      description: '',
      location: '',
      status: 'reported'
    })
  }

  const editVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setVehicleFormData({
      license_plate: vehicle.license_plate,
      type: vehicle.type,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      capacity: vehicle.capacity?.toString() || '',
      fuel_type: vehicle.fuel_type,
      fuel_consumption: vehicle.fuel_consumption?.toString() || '',
      insurance_expiry: vehicle.insurance_expiry || '',
      technical_inspection: vehicle.technical_inspection || '',
      mileage: vehicle.mileage?.toString() || '',
      status: vehicle.status,
      driver_id: vehicle.driver_id || '',
      gps_tracker_id: vehicle.gps_tracker_id || '',
      last_service: vehicle.last_service || '',
      next_service: vehicle.next_service || '',
      location_id: vehicle.location_id || ''
    })
    setImagePreview(vehicle.image_url)
    setShowVehicleModal(true)
  }

  const deleteVehicle = async (id: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a járművet?')) {
      return
    }
    
    try {
      setLoading(true)
      
      // Delete vehicle
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a jármű törlésekor')
        return
      }
      
      toast.success('Jármű sikeresen törölve!')
      loadVehicles()
      
      // If the deleted vehicle was selected, clear selection
      if (selectedVehicle && selectedVehicle.id === id) {
        setSelectedVehicle(null)
      }
    } catch (error) {
      console.error('Hiba a jármű törlésekor:', error)
      toast.error('Hiba a jármű törlésekor')
    } finally {
      setLoading(false)
    }
  }

  const viewVehicle = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    
    try {
      // Get vehicle location from GPS tracker
      if (vehicle.gps_tracker_id) {
        const location = await gpsTracker.getVehicleLocation(vehicle.license_plate)
        setVehicleLocation(location)
      }
    } catch (error) {
      console.error('Hiba a jármű helyadatainak lekérdezésekor:', error)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDamageImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files)
      setDamageImageFiles(prev => [...prev, ...newFiles])
      
      // Create previews
      const newPreviews: string[] = []
      newFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews.push(e.target?.result as string)
          if (newPreviews.length === newFiles.length) {
            setDamageImagePreviews(prev => [...prev, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeDamageImage = (index: number) => {
    setDamageImageFiles(prev => prev.filter((_, i) => i !== index))
    setDamageImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const showMap = () => {
    setShowMapModal(true)
    
    // Initialize map in next tick
    setTimeout(() => {
      if (mapRef.current && vehicleLocation) {
        // In a real implementation, this would use the Google Maps API
        // For now, we'll just show a placeholder
        mapRef.current.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f0f0f0; color: #333; font-size: 16px;">
            <div style="text-align: center;">
              <div style="margin-bottom: 10px;">Jármű helyzete: ${vehicleLocation.location.latitude.toFixed(6)}, ${vehicleLocation.location.longitude.toFixed(6)}</div>
              <div>Sebesség: ${vehicleLocation.location.speed?.toFixed(1) || 0} km/h</div>
            </div>
          </div>
        `
      }
    }, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'maintenance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktív'
      case 'maintenance': return 'Karbantartás'
      case 'inactive': return 'Inaktív'
      default: return status
    }
  }

  const getDamageStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'in_review': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'rejected': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case 'fixed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getDamageStatusText = (status: string) => {
    switch (status) {
      case 'reported': return 'Bejelentve'
      case 'in_review': return 'Felülvizsgálat alatt'
      case 'approved': return 'Jóváhagyva'
      case 'rejected': return 'Elutasítva'
      case 'fixed': return 'Javítva'
      default: return status
    }
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.gps_tracker_id && vehicle.gps_tracker_id.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredDamageReports = damageReports.filter(report => 
    selectedVehicle ? report.vehicle_id === selectedVehicle.id : true
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Truck className="h-8 w-8 mr-3 text-blue-600" />
            Flotta
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Járművek és szállítások kezelése
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              resetVehicleForm()
              setEditingVehicle(null)
              setImageFile(null)
              setImagePreview(null)
              setShowVehicleModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Plus className="h-5 w-5 mr-2" />
            Új jármű
          </button>
        </div>
      </div>

      {/* Public Map */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Map className="h-5 w-5 mr-2 text-blue-600" />
            Flotta térkép
          </h2>
          <button
            onClick={() => window.open('https://fleet.trackgps.ro/public-map/763B74BB-B16C-4906-9FAB-BEEB66225966', '_blank')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Teljes képernyő
          </button>
        </div>
        
        <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <iframe 
            src="https://fleet.trackgps.ro/public-map/763B74BB-B16C-4906-9FAB-BEEB66225966" 
            className="absolute inset-0 w-full h-full"
            title="Flotta térkép"
            allowFullScreen
          ></iframe>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Mozgásban</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Leállítva</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Üresjárat</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-700 dark:text-gray-300">Offline</span>
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
                placeholder="Rendszám, modell vagy GPS ID..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Összes állapot</option>
              <option value="active">Aktív</option>
              <option value="maintenance">Karbantartás</option>
              <option value="inactive">Inaktív</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && vehicles.length === 0 ? (
          <div className="col-span-3 flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nincsenek járművek</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Még nem adott hozzá járműveket a flottához.
            </p>
            <button
              onClick={() => {
                resetVehicleForm()
                setEditingVehicle(null)
                setShowVehicleModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Új jármű
            </button>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mr-4">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{vehicle.model}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.license_plate}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                  {getStatusText(vehicle.status)}
                </span>
              </div>
              
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                {vehicle.image_url ? (
                  <img
                    src={vehicle.image_url}
                    alt={vehicle.model}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Truck className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Típus:</span>
                  <span className="text-gray-900 dark:text-white">{vehicle.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Évjárat:</span>
                  <span className="text-gray-900 dark:text-white">{vehicle.year || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Kilométeróra:</span>
                  <span className="text-gray-900 dark:text-white">{vehicle.mileage?.toLocaleString('hu-HU') || 0} km</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Üzemanyag:</span>
                  <span className="text-gray-900 dark:text-white">{vehicle.fuel_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Fogyasztás:</span>
                  <span className="text-gray-900 dark:text-white">{vehicle.fuel_consumption || 'N/A'} l/100km</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => viewVehicle(vehicle)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Részletek
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editVehicle(vehicle)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteVehicle(vehicle.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mr-4">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVehicle.model}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{selectedVehicle.license_plate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                    {selectedVehicle.image_url ? (
                      <img
                        src={selectedVehicle.image_url}
                        alt={selectedVehicle.model}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Truck className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Jármű adatok</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Típus:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Évjárat:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.year || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Kapacitás:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.capacity || 'N/A'} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Kilométeróra:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.mileage?.toLocaleString('hu-HU') || 0} km</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Üzemanyag:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.fuel_type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Fogyasztás:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.fuel_consumption || 'N/A'} l/100km</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Biztosítás lejárat:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.insurance_expiry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Műszaki vizsga:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.technical_inspection || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Utolsó szerviz:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.last_service || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Következő szerviz:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.next_service || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">GPS tracker ID:</span>
                        <span className="text-gray-900 dark:text-white">{selectedVehicle.gps_tracker_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Állapot:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedVehicle.status)}`}>
                          {getStatusText(selectedVehicle.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Sofőr</h3>
                    {selectedVehicle.profiles ? (
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedVehicle.profiles.full_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{selectedVehicle.profiles.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Nincs hozzárendelt sofőr</p>
                    )}
                  </div>
                </div>
                
                {/* Right Column */}
                <div>
                  {/* Location */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">Helyzet</h3>
                      {selectedVehicle.gps_tracker_id && (
                        <button
                          onClick={showMap}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Térkép megnyitása
                        </button>
                      )}
                    </div>
                    
                    {vehicleLocation ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Koordináták:</span>
                          <span className="text-gray-900 dark:text-white">
                            {vehicleLocation.location.latitude.toFixed(6)}, {vehicleLocation.location.longitude.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Sebesség:</span>
                          <span className="text-gray-900 dark:text-white">
                            {vehicleLocation.location.speed?.toFixed(1) || 0} km/h
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Állapot:</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vehicleLocation.status === 'moving' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {vehicleLocation.status === 'moving' ? 'Mozgásban' : 'Áll'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Utolsó frissítés:</span>
                          <span className="text-gray-900 dark:text-white">
                            {vehicleLocation.location.timestamp.toLocaleTimeString('hu-HU')}
                          </span>
                        </div>
                      </div>
                    ) : selectedVehicle.gps_tracker_id ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Nincs GPS tracker hozzárendelve</p>
                    )}
                  </div>
                  
                  {/* Damage Reports */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">Kárjelentések</h3>
                      <button
                        onClick={() => {
                          resetDamageForm()
                          setDamageFormData(prev => ({ ...prev, vehicle_id: selectedVehicle.id }))
                          setDamageImageFiles([])
                          setDamageImagePreviews([])
                          setShowDamageModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        Új kárjelentés
                      </button>
                    </div>
                    
                    {filteredDamageReports.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">Nincsenek kárjelentések</p>
                    ) : (
                      <div className="space-y-3">
                        {filteredDamageReports.map((report) => (
                          <div key={report.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{report.description}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(report.report_date).toLocaleDateString('hu-HU')} - {report.location}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDamageStatusColor(report.status)}`}>
                                {getDamageStatusText(report.status)}
                              </span>
                            </div>
                            
                            {report.images && report.images.length > 0 && (
                              <div className="mt-2 flex space-x-2 overflow-x-auto pb-2">
                                {report.images.map((image, index) => (
                                  <img
                                    key={index}
                                    src={image}
                                    alt={`Kár ${index + 1}`}
                                    className="h-16 w-16 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Bejelentő: {report.profiles?.full_name || 'Ismeretlen'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => editVehicle(selectedVehicle)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Edit className="h-4 w-4 mr-2 inline" />
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => {
                        resetDamageForm()
                        setDamageFormData(prev => ({ ...prev, vehicle_id: selectedVehicle.id }))
                        setDamageImageFiles([])
                        setDamageImagePreviews([])
                        setShowDamageModal(true)
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2 inline" />
                      Kárjelentés
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Form Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingVehicle ? 'Jármű szerkesztése' : 'Új jármű'}
                </h2>
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rendszám *
                    </label>
                    <input
                      type="text"
                      value={vehicleFormData.license_plate}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Modell *
                    </label>
                    <input
                      type="text"
                      value={vehicleFormData.model}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Típus
                    </label>
                    <select
                      value={vehicleFormData.type}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="truck">Teherautó</option>
                      <option value="van">Furgon</option>
                      <option value="car">Személyautó</option>
                      <option value="other">Egyéb</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Évjárat
                    </label>
                    <input
                      type="number"
                      value={vehicleFormData.year}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kapacitás (kg)
                    </label>
                    <input
                      type="number"
                      value={vehicleFormData.capacity}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Üzemanyag típus
                    </label>
                    <select
                      value={vehicleFormData.fuel_type}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, fuel_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="diesel">Dízel</option>
                      <option value="petrol">Benzin</option>
                      <option value="electric">Elektromos</option>
                      <option value="hybrid">Hibrid</option>
                      <option value="gas">Gáz</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fogyasztás (l/100km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vehicleFormData.fuel_consumption}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, fuel_consumption: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kilométeróra
                    </label>
                    <input
                      type="number"
                      value={vehicleFormData.mileage}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, mileage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Jármű kép
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Camera className="h-5 w-5 mr-2 inline" />
                        Kép feltöltése
                      </button>
                      {imagePreview && (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setImageFile(null)
                              setImagePreview(null)
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Biztosítás lejárat
                    </label>
                    <input
                      type="date"
                      value={vehicleFormData.insurance_expiry}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Műszaki vizsga
                    </label>
                    <input
                      type="date"
                      value={vehicleFormData.technical_inspection}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, technical_inspection: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Utolsó szerviz
                    </label>
                    <input
                      type="date"
                      value={vehicleFormData.last_service}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, last_service: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Következő szerviz
                    </label>
                    <input
                      type="date"
                      value={vehicleFormData.next_service}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, next_service: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sofőr
                    </label>
                    <select
                      value={vehicleFormData.driver_id}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Nincs hozzárendelve</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPS tracker ID
                    </label>
                    <input
                      type="text"
                      value={vehicleFormData.gps_tracker_id}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, gps_tracker_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Helyszín
                    </label>
                    <select
                      value={vehicleFormData.location_id}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, location_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Nincs hozzárendelve</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Állapot
                    </label>
                    <select
                      value={vehicleFormData.status}
                      onChange={(e) => setVehicleFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'maintenance' | 'inactive' }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="active">Aktív</option>
                      <option value="maintenance">Karbantartás</option>
                      <option value="inactive">Inaktív</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleVehicleSubmit}
                  disabled={loading || !vehicleFormData.license_plate || !vehicleFormData.model}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Mentés...' : editingVehicle ? 'Frissítés' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Damage Report Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Új kárjelentés
                </h2>
                <button
                  onClick={() => setShowDamageModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jármű *
                  </label>
                  <select
                    value={damageFormData.vehicle_id}
                    onChange={(e) => setDamageFormData(prev => ({ ...prev, vehicle_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    disabled={!!selectedVehicle}
                  >
                    <option value="">Válasszon járművet</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.model}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Leírás *
                  </label>
                  <textarea
                    value={damageFormData.description}
                    onChange={(e) => setDamageFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Helyszín *
                  </label>
                  <input
                    type="text"
                    value={damageFormData.location}
                    onChange={(e) => setDamageFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Állapot
                  </label>
                  <select
                    value={damageFormData.status}
                    onChange={(e) => setDamageFormData(prev => ({ ...prev, status: e.target.value as 'reported' | 'in_review' | 'approved' | 'rejected' | 'fixed' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="reported">Bejelentve</option>
                    <option value="in_review">Felülvizsgálat alatt</option>
                    <option value="approved">Jóváhagyva</option>
                    <option value="rejected">Elutasítva</option>
                    <option value="fixed">Javítva</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Képek
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      ref={damageFileInputRef}
                      onChange={handleDamageImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      onClick={() => damageFileInputRef.current?.click()}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Camera className="h-5 w-5 mr-2 inline" />
                      Képek feltöltése
                    </button>
                  </div>
                  
                  {damageImagePreviews.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {damageImagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeDamageImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDamageModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleDamageSubmit}
                  disabled={loading || !damageFormData.vehicle_id || !damageFormData.description || !damageFormData.location}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Jármű helyzete: {selectedVehicle?.license_plate}
                </h2>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg" ref={mapRef}></div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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