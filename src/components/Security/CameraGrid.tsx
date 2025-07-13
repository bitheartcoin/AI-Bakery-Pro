import React, { useState } from 'react';
import { Camera, Grid, Maximize2, RefreshCw } from 'lucide-react';
import CameraViewer from './CameraViewer';

interface CameraGridProps {
  cameras: any[];
  onRefresh: () => void;
  loading: boolean;
}

export default function CameraGrid({ cameras, onRefresh, loading }: CameraGridProps) {
  const [layout, setLayout] = useState<'2x2' | '1x3' | '1x2'>('2x2');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  
  const getGridClass = () => {
    switch (layout) {
      case '1x2': return 'grid-cols-2';
      case '1x3': return 'grid-cols-3';
      case '2x2': 
      default: return 'grid-cols-2';
    }
  };
  
  const handleCameraClick = (cameraId: string) => {
    setSelectedCamera(cameraId);
  };
  
  const handleCloseFullscreen = () => {
    setSelectedCamera(null);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (cameras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Camera className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">Nincsenek elérhető kamerák</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2 inline" />
          Frissítés
        </button>
      </div>
    );
  }
  
  // If a camera is selected for fullscreen view
  if (selectedCamera) {
    return (
      <div className="h-[calc(100vh-200px)]">
        <CameraViewer 
          cameraId={selectedCamera} 
          onClose={handleCloseFullscreen}
          isFullscreen={true}
        />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setLayout('2x2')}
            className={`p-2 rounded ${layout === '2x2' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setLayout('1x3')}
            className={`p-2 rounded ${layout === '1x3' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            <div className="flex items-center space-x-1">
              <div className="w-1 h-4 bg-current"></div>
              <div className="w-1 h-4 bg-current"></div>
              <div className="w-1 h-4 bg-current"></div>
            </div>
          </button>
          <button
            onClick={() => setLayout('1x2')}
            className={`p-2 rounded ${layout === '1x2' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-4 bg-current"></div>
              <div className="w-1.5 h-4 bg-current"></div>
            </div>
          </button>
        </div>
        
        <button
          onClick={onRefresh}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>
      
      <div className={`grid ${getGridClass()} gap-4`}>
        {cameras.map((camera) => (
          <div 
            key={camera.id}
            className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
          >
            <img 
              src={camera.snapshotUrl || camera.previewUrl} 
              alt={camera.name}
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkthbWVyYSBuZW0gZWzDqXJoZXTFkTwvdGV4dD48L3N2Zz4=";
              }}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full ${camera.isOnline ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                  <span className="text-white font-medium">{camera.name}</span>
                </div>
                <button
                  onClick={() => handleCameraClick(camera.id)}
                  className="p-1 bg-black/50 rounded hover:bg-black/70 text-white"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
              
              {camera.isRecording && (
                <div className="mt-2">
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full animate-pulse">
                    REC
                  </span>
                </div>
              )}
            </div>
            
            {/* Status indicator always visible */}
            <div className="absolute top-2 left-2">
              <span className={`inline-flex h-3 w-3 rounded-full ${camera.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            
            {/* Recording indicator always visible */}
            {camera.isRecording && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}