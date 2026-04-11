import { useState, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface UseLocationReturn {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationCoords | null>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location for booth check-in verification.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[Location] Permission error:', err);
        return false;
      }
    }
    return true; // iOS handled by Info.plist
  };

  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    setIsLoading(true);
    setError(null);

    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setError('Location permission denied');
      setIsLoading(false);
      Alert.alert(
        'Permission Required',
        'Location permission is required for check-in. Please enable it in Settings.',
      );
      return null;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const coords: LocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(coords);
          setIsLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMsg = 'Failed to get location';
          switch (err.code) {
            case 1:
              errorMsg = 'Location permission denied';
              break;
            case 2:
              errorMsg = 'Location unavailable. Please enable GPS.';
              break;
            case 3:
              errorMsg = 'Location request timed out. Please try again.';
              break;
          }
          setError(errorMsg);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
          forceRequestLocation: true,
          showLocationDialog: true,
        },
      );
    });
  }, []);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
  };
}

export default useLocation;
