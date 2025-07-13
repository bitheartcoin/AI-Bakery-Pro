import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCw, 
  Download, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  X,
  Maximize,
  Volume2,
  VolumeX
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { blueIrisApi } from '../../lib/blueIrisApi';
import { toast } from 'react-hot-toast';

interface CameraViewerProps {
  cameraId: string;
  onClose?: () => void;
  isFullscreen?: boolean;
}

export default function CameraViewer({ cameraId, onClose, isFullscreen = false }: CameraViewerProps) {
  const [camera, setCamera] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const streamIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadCamera();
    
    // Set up interval to update the image
    const interval = setInterval(() => {
      if (isPlaying && imageRef.current) {
        updateImage();
      }
    }, 2000);
    
    return () => {
      clearInterval(interval);
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [cameraId]);

  const loadCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const cameras = await blueIrisApi.getCameras();
      const foundCamera = cameras.find(cam => cam.id === cameraId);
      
      if (!foundCamera) {
        throw new Error('Camera not found');
      }
      
      setCamera(foundCamera);
      
      if (isPlaying) {
        startStream();
      }
    } catch (error) {
      console.error('Error loading camera:', error);
      setError('Failed to load camera. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateImage = () => {
    if (!imageRef.current || !camera) return;
    
    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    let snapshotUrl = camera.snapshotUrl || camera.previewUrl;
    
    // Add timestamp parameter to URL
    if (snapshotUrl.includes('?')) {
      snapshotUrl = `${snapshotUrl}&t=${timestamp}`;
    } else {
      snapshotUrl = `${snapshotUrl}?t=${timestamp}`;
    }
    
    // Set the image source
    if (imageRef.current) {
      imageRef.current.src = snapshotUrl;
    }
  };

  const startStream = () => {
    if (!camera || !imageRef.current) return;
    
    // Update the image
    updateImage();

    // Set up interval to update the image
    const interval = setInterval(() => {
      if (isPlaying) {
        updateImage();
      }
    }, 2000);
    
    streamIntervalRef.current = interval;
    setIsPlaying(true);
  };

  const stopStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopStream();
    } else {
      startStream();
    }
  };

  const handleRefresh = () => {
    loadCamera();
  };

  const handleDownload = () => {
    toast.success('Kép letöltése folyamatban...');
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, this would mute/unmute the audio
  };

  const toggleLiveMode = () => {
    setIsLive(!isLive);
    if (!isLive) {
      // Switch back to live mode
      setSelectedDate(new Date());
      startStream();
    } else {
      // Switch to playback mode
      stopStream();
    }
  };

  if (isLoading && !camera) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="text-red-500 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-center text-gray-700 dark:text-gray-300">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RotateCw className="h-4 w-4 mr-2 inline" />
          Újrapróbálás
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full' : 'h-[500px]'} bg-black rounded-lg overflow-hidden`}>
      {/* Video Stream */}
      <div className="relative flex-1 bg-black">
        <img
          ref={imageRef}
          src={camera?.snapshotUrl || camera?.previewUrl || ''}
          alt={camera?.name || 'Camera feed'}
          className="w-full h-full object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkthbWVyYSBuZW0gZWzDqXJoZXTFkTwvdGV4dD48L3N2Zz4=";
          }}
        />
        
        {/* Camera Info Overlay */}
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/70 to-transparent text-white flex justify-between items-center">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full ${camera?.isOnline ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
            <span className="font-medium">{camera?.name}</span>
          </div>
          {isLive ? (
            <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full animate-pulse">LIVE</span>
          ) : (
            <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded-full">
              {selectedDate.toLocaleDateString()}
            </span>
          )}
        </div>
        
        {/* Close Button (if in fullscreen) */}
        {isFullscreen && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Controls */}
      <div className="bg-gray-900 p-3 flex justify-between items-center">
        <div className="flex space-x-2">
          <button 
            onClick={togglePlayback}
            className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={handleRefresh}
            className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          
          <button 
            onClick={handleDownload}
            className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
          >
            <Download className="h-5 w-5" />
          </button>
          
          {camera?.audio && (
            <button 
              onClick={toggleMute}
              className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleLiveMode}
            className={`px-3 py-1 rounded text-xs font-medium ${
              isLive 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isLive ? 'LIVE' : 'Felvétel'}
          </button>
          
          {!isLive && (
            <div className="flex items-center space-x-2">
              <button className="p-1 text-white hover:bg-gray-700 rounded transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs w-32"
              />
              
              <button className="p-1 text-white hover:bg-gray-700 rounded transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {!isFullscreen && (
            <button 
              onClick={() => {
                // In a real implementation, this would trigger fullscreen mode
                toast.info('Teljes képernyős mód');
              }}
              className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
            >
              <Maximize className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}