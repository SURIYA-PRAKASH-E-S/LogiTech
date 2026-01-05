// lib/fallback-location.ts
import { logger } from '@/lib/logger';

export const fallbackLocationService = {
    getApproximateLocation: async (): Promise<{lat: number, lng: number}> => {
      // Try multiple fallback services
      const services = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json/',
        'https://freegeoip.app/json/'
      ];
      
      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              return { lat: data.latitude, lng: data.longitude };
            }
          }
        } catch (error) {
          logger.warning('Location service failed', service);
        }
      }
      
      // Default fallback locations (major Indian cities)
      const indianCities = [
        { lat: 28.6139, lng: 77.2090 }, // Delhi
        { lat: 19.0760, lng: 72.8777 }, // Mumbai
        { lat: 12.9716, lng: 77.5946 }, // Bangalore
        { lat: 13.0827, lng: 80.2707 }, // Chennai
        { lat: 22.5726, lng: 88.3639 }, // Kolkata
      ];
      
      // Return a random Indian city
      const randomCity = indianCities[Math.floor(Math.random() * indianCities.length)];
      logger.info('Using default fallback location', randomCity);
      return randomCity;
    }
  };