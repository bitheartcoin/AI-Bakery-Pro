import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Settings, 
  Upload, 
  Search, 
  Save, 
  X, 
  Terminal,
  Car,
  User,
  Package,
  Bot
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AISecurityIntegrationProps {
  serverUrl?: string;
  apiKey?: string;
  onDetection?: (detection: any) => void;
}

interface Detection {
  id: string;
  timestamp: Date;
  type: 'face' | 'license_plate' | 'object';
  confidence: number;
  label: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  image?: string;
}

export default function AISecurityIntegration({ 
  serverUrl = 'http://localhost:5000', 
  apiKey = '', 
  onDetection 
}: AISecurityIntegrationProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [settings, setSettings] = useState({
    serverUrl: serverUrl,
    apiKey: apiKey,
    detectionThreshold: 0.7,
    enableFaceDetection: true,
    enableLicensePlateDetection: true,
    enableObjectDetection: true,
    notifyOnDetection: true
  });
  const [selectedModel, setSelectedModel] = useState('yolov5');
  const [availableModels, setAvailableModels] = useState([
    { id: 'yolov5', name: 'YOLOv5', type: 'object' },
    { id: 'face-recognition', name: 'Face Recognition', type: 'face' },
    { id: 'license-plate', name: 'License Plate Reader', type: 'license_plate' }
  ]);
  const [trainingData, setTrainingData] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trainingInProgress, setTrainingInProgress] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  useEffect(() => {
    // Simulate connection to CodeProject.AI server
    checkConnection();
    
    // Simulate periodic detection updates
    const interval = setInterval(() => {
      if (connected) {
        simulateDetection();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [connected]);

  const checkConnection = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would check the connection to the CodeProject.AI server
      // For demo purposes, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setConnected(true);
      addLog('Connected to CodeProject.AI server');
      addLog('Server version: 2.2.5');
      addLog('Available modules: Object Detection, Face Recognition, License Plate Reader');
      
      // Simulate loading available models
      const mockModels = [
        { id: 'yolov5', name: 'YOLOv5', type: 'object' },
        { id: 'yolov8', name: 'YOLOv8', type: 'object' },
        { id: 'face-recognition', name: 'Face Recognition', type: 'face' },
        { id: 'license-plate', name: 'License Plate Reader', type: 'license_plate' },
        { id: 'custom-bakery', name: 'Custom Bakery Products', type: 'object' }
      ];
      
      setAvailableModels(mockModels);
    } catch (error) {
      console.error('Error connecting to AI server:', error);
      setConnected(false);
      addLog('Failed to connect to CodeProject.AI server');
    } finally {
      setLoading(false);
    }
  };

  const simulateDetection = () => {
    // Simulate a random detection
    const types = ['face', 'license_plate', 'object'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    
    let label = '';
    if (type === 'face') {
      label = ['Kovács János', 'Szabó Anna', 'Ismeretlen személy'][Math.floor(Math.random() * 3)];
    } else if (type === 'license_plate') {
      label = ['ABC-123', 'XYZ-789', 'DEF-456'][Math.floor(Math.random() * 3)];
    } else {
      label = ['person', 'car', 'bread', 'pastry', 'package'][Math.floor(Math.random() * 5)];
    }
    
    const confidence = 0.5 + Math.random() * 0.5; // 0.5 - 1.0
    
    const detection: Detection = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      confidence,
      label,
      boundingBox: {
        x: Math.random() * 0.8,
        y: Math.random() * 0.8,
        width: 0.1 + Math.random() * 0.2,
        height: 0.1 + Math.random() * 0.2
      }
    };
    
    if (confidence > settings.detectionThreshold) {
      // Only add detections above the threshold
      setDetections(prev => [detection, ...prev].slice(0, 20));
      
      if (settings.notifyOnDetection) {
        // Notify based on detection type
        if (type === 'face' && settings.enableFaceDetection) {
          if (label === 'Ismeretlen személy') {
            toast.error(`Ismeretlen személy észlelve! (${(confidence * 100).toFixed(1)}%)`);
            addLog(`ALERT: Unknown person detected with ${(confidence * 100).toFixed(1)}% confidence`);
          } else {
            toast.success(`Személy azonosítva: ${label} (${(confidence * 100).toFixed(1)}%)`);
            addLog(`INFO: Person identified: ${label} with ${(confidence * 100).toFixed(1)}% confidence`);
          }
        } else if (type === 'license_plate' && settings.enableLicensePlateDetection) {
          toast.success(`Rendszám felismerve: ${label} (${(confidence * 100).toFixed(1)}%)`);
          addLog(`INFO: License plate detected: ${label} with ${(confidence * 100).toFixed(1)}% confidence`);
        } else if (type === 'object' && settings.enableObjectDetection) {
          if (label === 'person') {
            addLog(`INFO: Person detected with ${(confidence * 100).toFixed(1)}% confidence`);
          } else {
            addLog(`INFO: Object detected: ${label} with ${(confidence * 100).toFixed(1)}% confidence`);
          }
        }
      }
      
      // Call the onDetection callback if provided
      if (onDetection) {
        onDetection(detection);
      }
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setServerLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  };

  const handleSaveSettings = () => {
    // In a real implementation, this would save the settings to the server
    toast.success('Beállítások sikeresen mentve!');
    setShowSettings(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setTrainingData(files);
    }
  };

  const handleStartTraining = () => {
    if (trainingData.length === 0) {
      toast.error('Kérjük, töltsön fel képeket a tanításhoz!');
      return;
    }
    
    setTrainingInProgress(true);
    setTrainingProgress(0);
    
    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTrainingInProgress(false);
          toast.success('Modell tanítása sikeresen befejeződött!');
          addLog(`INFO: Model training completed for ${selectedModel}`);
          return 100;
        }
        return prev + 5;
      });
    }, 500);
  };

  const getDetectionIcon = (type: string) => {
    switch (type) {
      case 'face': return <User className="h-5 w-5" />;
      case 'license_plate': return <Car className="h-5 w-5" />;
      case 'object': return <Package className="h-5 w-5" />;
      default: return <Eye className="h-5 w-5" />;
    }
  };

  const getDetectionColor = (confidence: number) => {
    if (confidence > 0.9) return 'text-green-500';
    if (confidence > 0.7) return 'text-blue-500';
    if (confidence > 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Bot className="h-6 w-6 mr-2 text-blue-600" />
            CodeProject.AI Integráció
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mesterséges intelligencia alapú biztonsági rendszer
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={checkConnection}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Kapcsolat ellenőrzése
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center text-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Beállítások
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center text-sm"
          >
            <Terminal className="h-4 w-4 mr-2" />
            {showLogs ? 'Logok elrejtése' : 'Logok mutatása'}
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border ${
        connected 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center">
          {connected ? (
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
          )}
          <div>
            <p className={`font-medium ${
              connected ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
            }`}>
              {connected ? 'Kapcsolódva a CodeProject.AI szerverhez' : 'Nincs kapcsolat a szerverrel'}
            </p>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
              {connected 
                ? `Szerver: ${settings.serverUrl}` 
                : 'Kérjük ellenőrizze a kapcsolatot és a beállításokat'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Észlelések</h3>
          
          {detections.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Még nincsenek észlelések</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {detections.map(detection => (
                <div 
                  key={detection.id} 
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full ${
                        detection.type === 'face' 
                          ? 'bg-blue-100 dark:bg-blue-900/20' 
                          : detection.type === 'license_plate'
                          ? 'bg-purple-100 dark:bg-purple-900/20'
                          : 'bg-green-100 dark:bg-green-900/20'
                      } mr-3`}>
                        {getDetectionIcon(detection.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{detection.label}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {detection.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center ${getDetectionColor(detection.confidence)}`}>
                      <span className="font-medium">{(detection.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Modell tanítása</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modell kiválasztása
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.type === 'face' ? 'Arc' : model.type === 'license_plate' ? 'Rendszám' : 'Tárgy'})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tanító képek feltöltése
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500"
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Kattintson vagy húzza ide a képeket
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
              {trainingData.length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {trainingData.length} kép kiválasztva
                </p>
              )}
            </div>
            
            {trainingInProgress && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Tanítás folyamatban...</span>
                  <span className="text-gray-700 dark:text-gray-300">{trainingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleStartTraining}
              disabled={trainingData.length === 0 || trainingInProgress}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {trainingInProgress ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Tanítás folyamatban...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Modell tanítása
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Server Logs */}
      {showLogs && (
        <div className="bg-black rounded-xl p-4 shadow-sm border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-white">Szerver logok</h3>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
            {serverLogs.length === 0 ? (
              <p className="text-gray-500">Nincsenek logok</p>
            ) : (
              serverLogs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.includes('ERROR') || log.includes('ALERT') 
                    ? 'text-red-400' 
                    : log.includes('WARNING') 
                    ? 'text-yellow-400' 
                    : log.includes('INFO') 
                    ? 'text-blue-400' 
                    : 'text-gray-300'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  CodeProject.AI Beállítások
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Szerver URL
                  </label>
                  <input
                    type="text"
                    value={settings.serverUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, serverUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Kulcs
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Észlelési küszöbérték ({(settings.detectionThreshold * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.detectionThreshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, detectionThreshold: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Észlelési típusok
                  </label>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableFaceDetection"
                      checked={settings.enableFaceDetection}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableFaceDetection: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableFaceDetection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Arcfelismerés
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableLicensePlateDetection"
                      checked={settings.enableLicensePlateDetection}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableLicensePlateDetection: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableLicensePlateDetection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Rendszámtábla felismerés
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableObjectDetection"
                      checked={settings.enableObjectDetection}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableObjectDetection: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableObjectDetection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Tárgyfelismerés
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifyOnDetection"
                    checked={settings.notifyOnDetection}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifyOnDetection: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifyOnDetection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Értesítés észleléskor
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
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
  );
}