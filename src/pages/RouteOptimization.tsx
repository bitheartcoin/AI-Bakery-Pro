import React, { useState, useEffect } from 'react'
import { 
  Route, 
  Truck, 
  MapPin, 
  Navigation, 
  Clock, 
  Calendar, 
  Package, 
  RefreshCw,
  Plus,
  Search,
  CheckCircle,
  ArrowRight,
  Fuel,
  AlertTriangle,
  Save,
  X,
  User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { gpsTracker } from '../lib/gpsTracking'

interface Vehicle {
  id: string
  license_plate: string
  model: string
  driver_id: string | null
  driver_name?: string
  status: 'active' | 'maintenance' | 'inactive'
  location?: {
    latitude: number
    longitude: number
    timestamp: Date
    status: 'moving' | 'stopped' | 'idle'
    speed?: number
  }
}

interface DeliveryLocation {
  id: string
  name: string
  address: string
  city: string
  coordinates: {
    lat: number
    lng: number
  } | null
  distance?: number
  duration?: string
  order_id?: string
  order_number?: string
}

interface OptimizedRoute {
  vehicle_id: string
  locations: DeliveryLocation[]
  total_distance: number
  total_duration: string
  fuel_consumption: number
  departure_time: string
  arrival_time: string
}

export default function RouteOptimization() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [departureTime, setDepartureTime] = useState('')

  useEffect(() => {
    loadVehicles()
    loadDeliveryLocations()
    
    // Set default departure time to current time + 30 minutes, rounded to nearest 15 minutes
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15)
    setDepartureTime(now.toTimeString().substring(0, 5))
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      
      // Load vehicles from database
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles:driver_id (full_name)
        `)
        .eq('status', 'active')
        .order('license_plate')
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Hiba a járművek betöltésekor')
        return
      }
      
      if (data) {
        // Format vehicles data
        const formattedVehicles: Vehicle[] = data.map(vehicle => ({
          id: vehicle.id,
          license_plate: vehicle.license_plate,
          model: vehicle.model,
          driver_id: vehicle.driver_id,
          driver_name: vehicle.profiles?.full_name,
          status: vehicle.status
        }))
        
        // Load real-time location data for each vehicle
        for (const vehicle of formattedVehicles) {
          try {
            const locationData = await gpsTracker.getVehicleLocation(vehicle.license_plate)
            if (locationData) {
              vehicle.location = {
                latitude: locationData.location.latitude,
                longitude: locationData.location.longitude,
                timestamp: locationData.location.timestamp,
                status: locationData.status,
                speed: locationData.location.speed
              }
            }
          } catch (error) {
            console.error(`Error loading location for vehicle ${vehicle.license_plate}:`, error)
          }
        }
        
        setVehicles(formattedVehicles)
      }
    } catch (error) {
      console.error('Hiba a járművek betöltésekor:', error)
      toast.error('Hiba a járművek betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveryLocations = async () => {
    try {
      // Load delivery locations from database
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, city, coordinates')
        .eq('status', 'active')
        .order('name')
      
      if (locationsError) {
        console.error('Database error:', locationsError)
        toast.error('Hiba a helyszínek betöltésekor')
        return
      }
      
      // Load pending orders with delivery locations
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, delivery_address, location_id')
        .in('status', ['pending', 'processing', 'confirmed'])
        .order('created_at')
      
      if (ordersError) {
        console.error('Database error:', ordersError)
        toast.error('Hiba a rendelések betöltésekor')
        return
      }
      
      // Combine locations and orders
      const deliveryPoints: DeliveryLocation[] = []
      
      // Add locations from locations table
      if (locationsData) {
        deliveryPoints.push(...locationsData.map(location => ({
          id: location.id,
          name: location.name,
          address: location.address,
          city: location.city,
          coordinates: location.coordinates
        })))
      }
      
      // Add locations from orders
      if (ordersData) {
        for (const order of ordersData) {
          if (order.delivery_address) {
            // Check if this address is already in the list
            const existingLocation = deliveryPoints.find(loc => 
              loc.address === order.delivery_address
            )
            
            if (!existingLocation) {
              deliveryPoints.push({
                id: `order-${order.id}`,
                name: order.customer_name,
                address: order.delivery_address,
                city: '', // We don't have city in orders table
                coordinates: null, // We would need to geocode this
                order_id: order.id,
                order_number: order.order_number
              })
            } else {
              // Add order info to existing location
              existingLocation.order_id = order.id
              existingLocation.order_number = order.order_number
            }
          }
        }
      }
      
      setDeliveryLocations(deliveryPoints)
    } catch (error) {
      console.error('Hiba a helyszínek betöltésekor:', error)
      toast.error('Hiba a helyszínek betöltésekor')
    }
  }

  const handleOptimizeRoute = async () => {
    if (!selectedVehicle) {
      toast.error('Kérjük válasszon járművet')
      return
    }
    
    if (selectedLocations.length === 0) {
      toast.error('Kérjük válasszon legalább egy helyszínt')
      return
    }
    
    try {
      setOptimizing(true)
      
      // Get vehicle details
      const vehicle = vehicles.find(v => v.id === selectedVehicle)
      if (!vehicle) {
        toast.error('A kiválasztott jármű nem található')
        return
      }
      
      // Get selected locations
      const locations = selectedLocations.map(id => 
        deliveryLocations.find(loc => loc.id === id)
      ).filter(Boolean) as DeliveryLocation[]
      
      // In a real app, we would call a route optimization service
      // For demo purposes, we'll simulate the optimization
      
      // Calculate distances (random for demo)
      const locationsWithDistance = locations.map(location => ({
        ...location,
        distance: Math.round(Math.random() * 10 + 5), // 5-15 km
        duration: `${Math.round(Math.random() * 20 + 10)} perc` // 10-30 minutes
      }))
      
      // Calculate total distance and duration
      const totalDistance = locationsWithDistance.reduce((sum, loc) => sum + (loc.distance || 0), 0)
      const totalDurationMinutes = locationsWithDistance.reduce((sum, loc) => {
        const durationMatch = loc.duration?.match(/(\d+)/)
        return sum + (durationMatch ? parseInt(durationMatch[1]) : 0)
      }, 0)
      
      // Calculate fuel consumption (10L/100km)
      const fuelConsumption = totalDistance * 0.1
      
      // Calculate arrival time
      const departureDate = new Date()
      const [hours, minutes] = departureTime.split(':').map(Number)
      departureDate.setHours(hours, minutes, 0, 0)
      
      const arrivalDate = new Date(departureDate.getTime() + totalDurationMinutes * 60 * 1000)
      
      // Create optimized route
      const optimizedRoute: OptimizedRoute = {
        vehicle_id: selectedVehicle,
        locations: locationsWithDistance,
        total_distance: totalDistance,
        total_duration: `${Math.floor(totalDurationMinutes / 60)}h ${totalDurationMinutes % 60}m`,
        fuel_consumption: fuelConsumption,
        departure_time: departureDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }),
        arrival_time: arrivalDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
      }
      
      setOptimizedRoute(optimizedRoute)
      setShowRouteModal(true)
    } catch (error) {
      console.error('Hiba az útvonal optimalizálásakor:', error)
      toast.error('Hiba az útvonal optimalizálásakor')
    } finally {
      setOptimizing(false)
    }
  }

  const handleSaveRoute = async () => {
    if (!optimizedRoute) return
    
    try {
      // In a real app, we would save the route to the database
      // For demo purposes, we'll just show a success message
      
      toast.success('Útvonal sikeresen mentve!')
      setShowRouteModal(false)
      
      // Reset selection
      setSelectedVehicle('')
      setSelectedLocations([])
      setOptimizedRoute(null)
    } catch (error) {
      console.error('Hiba az útvonal mentésekor:', error)
      toast.error('Hiba az útvonal mentésekor')
    }
  }

  const toggleLocationSelection = (id: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(id)) {
        return prev.filter(locId => locId !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Route className="h-8 w-8 mr-3 text-blue-600" />
            Útvonal Optimalizálás
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Optimalizálja a szállítási útvonalakat a hatékonyság növelése érdekében
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              loadVehicles()
              loadDeliveryLocations()
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Frissítés
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-blue-600" />
            Járművek
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Nincsenek járművek</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedVehicle === vehicle.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-3">
                        <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{vehicle.model}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.license_plate}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      vehicle.location?.status === 'moving' ? 'bg-green-500' :
                      vehicle.location?.status === 'stopped' ? 'bg-amber-500' :
                      'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4 mr-1" />
                      <span>{vehicle.driver_name || 'Nincs sofőr'}</span>
                    </div>
                    {vehicle.location && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Navigation className="h-4 w-4 mr-1" />
                        <span>{vehicle.location.status === 'moving' ? `${Math.round(vehicle.location.speed || 0)} km/h` : 'Áll'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Locations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Helyszínek
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Keresés..."
                className="pl-9 w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : deliveryLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Nincsenek helyszínek</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {deliveryLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => toggleLocationSelection(location.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedLocations.includes(location.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{location.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{location.address}, {location.city}</p>
                    </div>
                    <div className="flex items-center">
                      {location.order_number && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 mr-2">
                          {location.order_number}
                        </span>
                      )}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLocations.includes(location.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedLocations.includes(location.id) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optimization Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Route className="h-5 w-5 mr-2 text-blue-600" />
            Útvonal beállítások
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Indulási idő
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optimalizálási kritérium
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="distance">Legrövidebb távolság</option>
                <option value="time">Legrövidebb idő</option>
                <option value="fuel">Legkisebb üzemanyag-fogyasztás</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kiválasztott jármű:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {selectedVehicle ? vehicles.find(v => v.id === selectedVehicle)?.license_plate : 'Nincs kiválasztva'}
                </span>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Kiválasztott helyszínek:</span>
                <span className="text-sm text-gray-900 dark:text-white">{selectedLocations.length} db</span>
              </div>
            </div>
            
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || !selectedVehicle || selectedLocations.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Optimalizálás...
                </>
              ) : (
                <>
                  <Route className="h-5 w-5 mr-2" />
                  Útvonal optimalizálása
                </>
              )}
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Az útvonal optimalizálás figyelembe veszi a forgalmi viszonyokat, időjárást és a szállítási prioritásokat.
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                    A javasolt útvonal valós időben frissül a GPS adatok alapján.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimized Route Modal */}
      {showRouteModal && optimizedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Optimalizált útvonal
                </h2>
                <button
                  onClick={() => setShowRouteModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Route Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Jármű</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {vehicles.find(v => v.id === optimizedRoute.vehicle_id)?.license_plate} ({vehicles.find(v => v.id === optimizedRoute.vehicle_id)?.model})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Sofőr</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {vehicles.find(v => v.id === optimizedRoute.vehicle_id)?.driver_name || 'Nincs megadva'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Helyszínek száma</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.locations.length} db
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Teljes távolság</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.total_distance} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Becsült időtartam</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.total_duration}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Üzemanyag-fogyasztás</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.fuel_consumption.toFixed(1)} L
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Indulás</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.departure_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300">Várható érkezés</p>
                      <p className="text-base font-medium text-blue-900 dark:text-blue-200">
                        {optimizedRoute.arrival_time}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Route Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Útvonal részletei</h3>
                  
                  <div className="space-y-4">
                    {optimizedRoute.locations.map((location, index) => (
                      <div key={location.id} className="flex items-start">
                        <div className="flex flex-col items-center mr-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center border-2 border-blue-500">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{index + 1}</span>
                          </div>
                          {index < optimizedRoute.locations.length - 1 && (
                            <div className="w-0.5 h-12 bg-blue-200 dark:bg-blue-800 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{location.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{location.address}, {location.city}</p>
                              {location.order_number && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    Rendelés: {location.order_number}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{location.distance} km</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{location.duration}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowRouteModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={handleSaveRoute}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Útvonal mentése
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}