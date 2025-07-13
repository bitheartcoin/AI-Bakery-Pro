// GPS Tracking API for vehicle monitoring
// Based on the TrackGPS API documentation: https://docs.trackgps.ro/hu/clientintegrationpi/methods/carriers/index.html

export interface GPSLocation {
  latitude: number
  longitude: number
  timestamp: Date
  speed?: number
  heading?: number
  accuracy?: number
}

export interface VehicleLocation {
  vehicleId: string
  licensePlate: string
  location: GPSLocation
  status: 'moving' | 'stopped' | 'idle'
  driver?: string
}

class GPSTrackingAPI {
  private apiKey: string
  private baseUrl: string = 'https://api.trackgps.ro/api'
  private username: string
  private password: string

  constructor(
    apiKey: string = 'arobs', 
    baseUrl: string = 'https://api.trackgps.ro/api',
    username: string = 'szemesipekseg',
    password: string = 'bakery2025'
  ) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.username = username
    this.password = password
  }

  /**
   * Get current location of a vehicle
   */
  async getVehicleLocation(vehicleId: string): Promise<VehicleLocation | null> {
    try {
      // In a real implementation, this would call the TrackGPS API
      // Using the TrackGPS API documentation
      const url = `${this.baseUrl}/carriers/${vehicleId}/location`;
      
      // In a real implementation, we would make an actual API call
      // For now, we'll still use mock data but with real vehicle IDs from the screenshots
      const mockData = this.getMockVehicleLocation(vehicleId);
      
      // Add real vehicle data based on the screenshots
      if (vehicleId === 'JOV-030' || vehicleId === 'JOV-030') {
        mockData.licensePlate = 'JOV-030';
        mockData.location.latitude = 46.8167; // Balatonszemes area
        mockData.location.longitude = 17.7833;
        mockData.status = 'moving';
      } else if (vehicleId === 'LSF-606') {
        mockData.licensePlate = 'LSF-606';
        mockData.location.latitude = 46.8500; // Balatonszárszó area
        mockData.location.longitude = 17.8333;
        mockData.status = 'stopped';
      } else if (vehicleId === 'LVK-378') {
        mockData.licensePlate = 'LVK-378';
        mockData.location.latitude = 46.7900;
        mockData.location.longitude = 17.7600;
        mockData.status = 'moving';
      } else if (vehicleId === 'RKA-376') {
        mockData.licensePlate = 'RKA-376';
        mockData.location.latitude = 46.8000;
        mockData.location.longitude = 17.7500;
        mockData.status = 'moving';
      }
      
      return mockData;
    } catch (error) {
      console.error('GPS tracking error:', error)
      return null
    }
  }

  /**
   * Get location history for a vehicle
   */
  async getVehicleHistory(
    vehicleId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<GPSLocation[]> {
    try {
      // In a real implementation, this would call the TrackGPS API
      // For demo purposes, we'll return mock data
      return this.getMockVehicleHistory(vehicleId, startDate, endDate)
    } catch (error) {
      console.error('GPS history error:', error)
      return []
    }
  }

  /**
   * Get all vehicle locations
   */
  async getAllVehicleLocations(): Promise<VehicleLocation[]> {
    try {
      // In a real implementation, this would call the TrackGPS API
      // For demo purposes, we'll return mock data
      return this.createMockVehicleLocations()
    } catch (error) {
      console.error('GPS all vehicles error:', error)
      return []
    }
  }

  /**
   * Calculate distance between two GPS points
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get mock vehicle location
   */
  private getMockVehicleLocation(vehicleId: string): VehicleLocation {
    // Generate a location near Balatonszemes
    return {
      vehicleId,
      licensePlate: this.getLicensePlateForVehicle(vehicleId),
      location: {
        latitude: 46.8167 + (Math.random() - 0.5) * 0.01,
        longitude: 17.7833 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date(),
        speed: Math.random() * 60,
        heading: Math.random() * 360,
        accuracy: 5
      },
      status: Math.random() > 0.5 ? 'moving' : 'stopped',
      driver: this.getDriverForVehicle(vehicleId)
    }
  }

  /**
   * Get mock vehicle history
   */
  private getMockVehicleHistory(vehicleId: string, startDate: Date, endDate: Date): GPSLocation[] {
    const locations: GPSLocation[] = []
    const start = startDate.getTime()
    const end = endDate.getTime()
    const interval = (end - start) / 10 // 10 points

    for (let i = 0; i < 10; i++) {
      locations.push({
        latitude: 46.8167 + (Math.random() - 0.5) * 0.1,
        longitude: 17.7833 + (Math.random() - 0.5) * 0.1,
        timestamp: new Date(start + (i * interval)),
        speed: Math.random() * 60,
        heading: Math.random() * 360,
        accuracy: 5
      })
    }

    return locations
  }

  /**
   * Get license plate for vehicle
   */
  private getLicensePlateForVehicle(vehicleId: string): string {
    const licensePlates: Record<string, string> = {
      '1': 'RKA-376',
      '2': 'JOV-030',
      '3': 'LSF-606',
      '4': 'LVK-378'
    }
    return licensePlates[vehicleId] || `ABC-${vehicleId}`
  }

  /**
   * Get driver for vehicle
   */
  private getDriverForVehicle(vehicleId: string): string {
    const drivers: Record<string, string> = {
      '1': 'Tóth Gábor',
      '2': 'Kiss László',
      '3': 'Nagy Péter',
      '4': 'Szabó János'
    }
    return drivers[vehicleId] || 'Ismeretlen'
  }

  /**
   * Start tracking a vehicle
   */
  startTracking(vehicleId: string, callback: (location: VehicleLocation) => void): void {
    // In a real implementation, this would set up a WebSocket or polling connection
    // For demo purposes, we'll just simulate location updates
    setInterval(() => {
      const location = this.getMockVehicleLocation(vehicleId);
      callback(location);
    }, 10000); // Update every 10 seconds
  }

  /**
   * Create mock vehicle locations
   */
  createMockVehicleLocations(): VehicleLocation[] {
    return [
      {
        vehicleId: 'RKA-376',
        licensePlate: 'RKA-376',
        location: {
          latitude: 46.8167,
          longitude: 17.7833,
          timestamp: new Date(),
          speed: 45,
          heading: 90,
          accuracy: 5
        },
        status: 'moving',
        driver: 'Tóth Gábor'
      },
      {
        vehicleId: 'JOV-030',
        licensePlate: 'JOV-030',
        location: {
          latitude: 46.8000,
          longitude: 17.7500,
          timestamp: new Date(),
          speed: 0,
          heading: 0,
          accuracy: 3
        },
        status: 'stopped',
        driver: 'Kiss László'
      },
      {
        vehicleId: 'LSF-606',
        licensePlate: 'LSF-606',
        location: {
          latitude: 46.8500,
          longitude: 17.8000,
          timestamp: new Date(),
          speed: 25,
          heading: 180,
          accuracy: 8
        },
        status: 'moving',
        driver: 'Nagy Péter'
      },
      {
        vehicleId: 'LVK-378',
        licensePlate: 'LVK-378',
        location: {
          latitude: 46.7900,
          longitude: 17.7600,
          timestamp: new Date(),
          speed: 15,
          heading: 270,
          accuracy: 4
        },
        status: 'moving',
        driver: 'Szabó János'
      }
    ]
  }
}

// Default GPS tracking instance
export const gpsTracker = new GPSTrackingAPI()