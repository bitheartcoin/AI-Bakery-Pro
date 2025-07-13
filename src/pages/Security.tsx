import React, { useState, useEffect } from 'react'
import { 
  Camera, 
  Grid, 
  Play, 
  Pause, 
  Square, 
  ChefHat, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  Timer,
  DollarSign,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  X,
  ExternalLink
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

export default function Security() {
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState({ connected: false, serverUrl: '' })
  const [blueIrisConfig, setBlueIrisConfig] = useState({
    serverUrl: '',
    username: '',
    password: '',
    apiUrl: ''
  })
  
  // Camera definitions
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    loadBlueIrisConfig()
  }, [])

  const loadBlueIrisConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('category', 'blue_iris')
      
      if (error) {
        console.error('Error loading Blue Iris settings:', error)
        return
      }
      
      if (data && data.length > 0) {
        let config = {
          serverUrl: '',
          username: '',
          password: ''
        };
        
        try {
          const serverSetting = data.find(item => item.key === 'server');
          if (serverSetting && serverSetting.value) {
            config.serverUrl = serverSetting.value;
          }
          
          const usernameSetting = data.find(item => item.key === 'username');
          if (usernameSetting && usernameSetting.value) {
            config.username = usernameSetting.value;
          }
          
          const passwordSetting = data.find(item => item.key === 'password');
          if (passwordSetting && passwordSetting.value) {
            config.password = passwordSetting.value;
          }
        } catch (e) {
          console.error('Error parsing Blue Iris settings:', e);
        }
        
        setBlueIrisConfig(config)
        
        // Update connection status
        await updateConnectionStatus(config)
        
        // Load cameras if connected
        if (connectionStatus.connected) {
          await loadCameras(config)
        }
      }
    } catch (error) {
      console.error('Error loading Blue Iris config:', error)
    }
  }
  
  const loadCameras = async (config) => {
    try {
      if (!config.serverUrl) {
        setCameras([])
        return
      }
      
      // In a real implementation, this would fetch cameras from the BlueIris API
      // For now, we'll use mock data if not connected
      if (!connectionStatus.connected) {
        const mockCameras = [
          { id: 'Termelo_4K', name: 'Termelő 4K', status: 'offline', url: '' },
          { id: 'Foldvar', name: 'Földvár Bolt Utca', status: 'offline', url: '' },
          { id: 'Udvar_Pekseg', name: 'Udvar Pékség', status: 'offline', url: '' },
          { id: 'Leveles', name: 'Leveles', status: 'offline', url: '' },
          { id: 'Kiado_1', name: 'Kiadó 1', status: 'offline', url: '' },
          { id: 'Keleszto', name: 'Kenyeres Kelesztő', status: 'offline', url: '' }
        ]
        setCameras(mockCameras)
        return
      }
      
      // Try to fetch cameras from the BlueIris API
      try {
        const response = await fetch(`${config.serverUrl}/json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cmd: 'camlist',
            session: '0',
            username: config.username,
            password: config.password
          })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data && data.data) {
          const camerasData = data.data.map(cam => ({
            id: cam.optionValue,
            name: cam.optionDisplay,
            status: cam.isOnline ? 'online' : 'offline',
            url: `${config.serverUrl}/livestream.htm?cam=${cam.optionValue}`
          }))
          
          setCameras(camerasData)
        } else {
          // Fallback to mock data
          const mockCameras = [
            { id: 'Termelo_4K', name: 'Termelő 4K', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Termelo_4K` },
            { id: 'Foldvar', name: 'Földvár Bolt Utca', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Foldvar` },
            { id: 'Udvar_Pekseg', name: 'Udvar Pékség', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Udvar_Pekseg` },
            { id: 'Leveles', name: 'Leveles', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Leveles` },
            { id: 'Kiado_1', name: 'Kiadó 1', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Kiado_1` },
            { id: 'Keleszto', name: 'Kenyeres Kelesztő', status: 'online', url: `${config.serverUrl}/livestream.htm?cam=Keleszto` }
          ]
          setCameras(mockCameras)
        }
      } catch (error) {
        console.error('Error fetching cameras:', error)
        // Fallback to mock data
        const mockCameras = [
          { id: 'Termelo_4K', name: 'Termelő 4K', status: 'offline', url: '' },
          { id: 'Foldvar', name: 'Földvár Bolt Utca', status: 'offline', url: '' },
          { id: 'Udvar_Pekseg', name: 'Udvar Pékség', status: 'offline', url: '' },
          { id: 'Leveles', name: 'Leveles', status: 'offline', url: '' },
          { id: 'Kiado_1', name: 'Kiadó 1', status: 'offline', url: '' },
          { id: 'Keleszto', name: 'Kenyeres Kelesztő', status: 'offline', url: '' }
        ]
        setCameras(mockCameras)
      }
    } catch (error) {
      console.error('Error loading cameras:', error)
      setCameras([])
    }
  }

  const updateConnectionStatus = async (config = blueIrisConfig) => {
    // Simple check if the server URL is valid
    if (config.serverUrl && config.username && config.password) {
      try {
        // Try to connect to the BlueIris server
        const response = await fetch(`${config.serverUrl}/json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cmd: 'login',
            session: '0',
            username: config.username,
            password: config.password
          })
        })
        
        if (response.ok) {
          setConnectionStatus({
            connected: true,
            serverUrl: config.serverUrl
          });
          
          // Load cameras after successful connection
          await loadCameras(config)
        } else {
          setConnectionStatus({
            connected: false,
            serverUrl: config.serverUrl
          });
        }
      } catch (error) {
        console.error('Error connecting to BlueIris:', error);
        setConnectionStatus({
          connected: false,
          serverUrl: config.serverUrl
        });
      }
    } else {
      setConnectionStatus({
        connected: false,
        serverUrl: config.serverUrl || null
      })
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      
      // Save the configuration
      await updateConnectionStatus()
      
      // Save settings to database
      const settingsToSave = [
        { category: 'blue_iris', key: 'server', value: JSON.stringify(blueIrisConfig.serverUrl), is_public: false },
        { category: 'blue_iris', key: 'username', value: JSON.stringify(blueIrisConfig.username), is_public: false },
        { category: 'blue_iris', key: 'password', value: JSON.stringify(blueIrisConfig.password), is_public: false }
      ]
      
      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting)
        
        if (error) {
          console.error('Error saving setting:', error)
        }
      }
      
      setShowSettings(false)
      toast.success('Beállítások sikeresen mentve!')
    } catch (error) {
      console.error('Error saving BlueIris settings:', error)
      toast.error('Hiba a beállítások mentésekor')
      await updateConnectionStatus()
    } finally {
      setLoading(false)
    }
  }

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen)
  }
  
  const handleCameraSelect = (camera) => {
    setSelectedCamera(camera)
  }
  
  const getLivestreamUrl = (camera) => {
    if (!blueIrisConfig.serverUrl) return ''

    // Remove trailing slash if present
    const baseUrl = blueIrisConfig.serverUrl.endsWith('/') 
      ? blueIrisConfig.serverUrl.slice(0, -1) 
      : blueIrisConfig.serverUrl
      
    return camera.url || `${baseUrl}/livestream.htm?cam=${camera.id}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Camera className="h-8 w-8 mr-3 text-blue-600" />
            Biztonsági kamerák
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            BlueIris kamerarendszer integráció
            {!connectionStatus.connected && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (Demo mód - BlueIris szerver nem elérhető)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {fullscreen ? 'Normál nézet' : 'Teljes képernyő'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Beállítások
          </button>
          <a
            href={blueIrisConfig.serverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Megnyitás új ablakban
          </a>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!connectionStatus.connected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                BlueIris szerver nem elérhető
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                A kamerák demo módban jelennek meg. Ellenőrizze a BlueIris szerver beállításait és elérhetőségét.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Camera View */}
      {selectedCamera ? (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4 ${fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}>
          {fullscreen && (
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Camera className="h-5 w-5 mr-2 text-blue-600" />
              {selectedCamera.name}
            </h2>
            <button
              onClick={() => setSelectedCamera(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className={`w-full ${fullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'}`}>
            {connectionStatus.connected ? (
              <iframe 
                src={getLivestreamUrl(selectedCamera)}
                className="w-full h-full border-0"
                title={selectedCamera.name}
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    BlueIris szerver nem elérhető
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                    Kérjük, ellenőrizze a kapcsolati beállításokat és próbálja újra.
                  </p>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4 mr-2 inline-block" />
                    Beállítások
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Grid className="h-5 w-5 mr-2 text-blue-600" />
            Kamerák
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {cameras.map((camera) => (
              <div 
                key={camera.id}
                onClick={() => handleCameraSelect(camera)}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
              >
                <div className="aspect-video bg-black relative">
                  {connectionStatus.connected ? (
                    <img 
                      src={`${blueIrisConfig.serverUrl}/image/${camera.id}?q=60&s=100&timestamp=${Date.now()}`} 
                      alt={camera.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjEyMTIxIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkthbWVyYSBuZW0gZWzDqXJoZXTFkTwvdGV4dD48L3N2Zz4=";
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <Camera className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex h-3 w-3 rounded-full ${camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">{camera.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-4 ${fullscreen ? 'hidden' : ''}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rendszer állapot</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${connectionStatus.connected ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              {connectionStatus.connected ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">BlueIris Szerver</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {connectionStatus.serverUrl || blueIrisConfig.serverUrl || 'Nincs beállítva'}
              </p>
              <div className="flex items-center mt-1">
                <span className={`w-2 h-2 rounded-full mr-1 ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className={`text-xs ${connectionStatus.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {connectionStatus.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Kamerák</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {cameras.length} kamera elérhető
              </p>
              <div className="flex items-center mt-1">
                <span className="w-2 h-2 rounded-full mr-1 bg-blue-500"></span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {cameras.filter(c => c.status === 'online').length} online
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
              <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Frissítés</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Utolsó frissítés: {new Date().toLocaleTimeString()}
              </p>
              <div className="flex items-center mt-1">
                <a 
                  href="https://github.com/bp2008/ui3" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center"
                >
                  GitHub <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kamera beállítások</h2>
                  <p className="text-gray-600 dark:text-gray-400">BlueIris integráció konfigurálása</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Kapcsolat beállítások</h3>
                
                {/* Connection Status */}
                <div className={`p-4 rounded-xl mb-4 ${
                  connectionStatus.connected ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center">
                    {connectionStatus.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${connectionStatus.connected ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {connectionStatus.connected ? 'Kapcsolat aktív' : 'Nincs kapcsolat'}
                      </p>
                      <p className={`text-xs ${connectionStatus.connected ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {connectionStatus.connected 
                          ? 'A BlueIris szerver elérhető és működik'
                          : 'A BlueIris szerver nem elérhető. Ellenőrizze a beállításokat.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      BlueIris Szerver URL
                    </label>
                    <input
                      type="text"
                      placeholder="http://192.168.1.100:81"
                      value={blueIrisConfig.serverUrl}
                      onChange={(e) => setBlueIrisConfig({...blueIrisConfig, serverUrl: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Példa: http://192.168.1.100:81 vagy https://blueiris.example.com
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Felhasználónév
                      </label>
                      <input
                        type="text"
                        value={blueIrisConfig.username}
                        onChange={(e) => setBlueIrisConfig({...blueIrisConfig, username: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Jelszó
                      </label>
                      <input
                        type="password"
                        value={blueIrisConfig.password}
                        onChange={(e) => setBlueIrisConfig({...blueIrisConfig, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mentés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}