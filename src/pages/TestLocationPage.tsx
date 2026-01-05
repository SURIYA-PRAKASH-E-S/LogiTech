import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, CheckCircle, XCircle, AlertCircle, WifiOff, Satellite } from 'lucide-react';
import { locationService, vehicleService } from '@/lib/firebase-utils';
import { trackingService } from '@/lib/tracking-service';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export default function TestLocationPage() {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string>('');
  const [firebaseStatus, setFirebaseStatus] = useState<{status: 'idle' | 'loading' | 'success' | 'error', message: string}>({status: 'idle', message: ''});
  const [isTesting, setIsTesting] = useState(false);
  const [testVehicleId] = useState('test-vehicle-' + Date.now().toString().slice(-6));
  const [firebaseData, setFirebaseData] = useState<any>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Check location permission status
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          setLocationPermission(permissionStatus.state);
          
          permissionStatus.onchange = () => {
            setLocationPermission(permissionStatus.state);
          };
        })
      .catch(logger.error);
    }
  }, []);

  // Check if we're on HTTPS (required for geolocation)
  const isHTTPS = window.location.protocol === 'https:';

  const getCurrentLocation = () => {
    setIsTesting(true);
    setError('');
    setFirebaseStatus({status: 'loading', message: 'Getting location...'});
    
    if (!navigator.geolocation) {
      setError('Geolocation API is not supported by your browser');
      setFirebaseStatus({status: 'error', message: 'Browser not supported'});
      setIsTesting(false);
      return;
    }

    if (!isHTTPS) {
      setError('Geolocation requires HTTPS. Please use HTTPS or localhost.');
      setFirebaseStatus({status: 'error', message: 'HTTPS required'});
      setIsTesting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocation(position);
        setError('');
        
        // Test Firebase update
        try {
          setFirebaseStatus({status: 'loading', message: 'Saving to Firebase...'});
          
          await locationService.updateLocation(
            testVehicleId, 
            position.coords.latitude, 
            position.coords.longitude
          );
          
          setFirebaseStatus({
            status: 'success', 
            message: `✅ Location saved to Firebase (Vehicle ID: ${testVehicleId})`
          });
          
          // Verify the data was saved
          setTimeout(() => {
            checkFirebaseData();
          }, 1000);
          
        } catch (firebaseError: any) {
          setFirebaseStatus({
            status: 'error', 
            message: `❌ Firebase error: ${firebaseError.message || 'Unknown error'}`
          });
      logger.error('Firebase error', firebaseError.message || 'Unknown error');
        } finally {
          setIsTesting(false);
        }
      },
      (err) => {
        let errorMessage = '';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please allow location access.';
            setLocationPermission('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Check your device GPS.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Try again.';
            break;
          default:
            errorMessage = `Error: ${err.message}`;
        }
        setError(errorMessage);
        setFirebaseStatus({status: 'error', message: 'Location acquisition failed'});
        setIsTesting(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  const checkFirebaseData = async () => {
    try {
      const locationRef = ref(database, `vehicleLocations/${testVehicleId}`);
      const snapshot = await get(locationRef);
      
      if (snapshot.exists()) {
        setFirebaseData(snapshot.val());
      } else {
        setFirebaseData(null);
      }
    } catch (error) {
      logger.error('Error checking Firebase', error.message || 'Unknown error');
    }
  };

  const runCompleteTest = async () => {
    setIsTesting(true);
    await getCurrentLocation();
  };

  const testLocationSharing = async () => {
    try {
      logger.info('Testing location sharing');
      
      // Test sharing (replace with actual IDs from your database)
      const driverId = '3B2FXrCSBsWMiTuVhqhBByg3tcv1'; // Your existing driver
      const customerId = 'iXGudjKuaQVUWXGUy2BtPZegeCx2'; // Your existing customer
      
      await trackingService.shareDriverLocationWithCustomer(driverId, customerId);
      logger.success('Location shared successfully');
      
      // Test if customer can track
      const canTrack = await trackingService.canCustomerTrackDriver(driverId, customerId);
      logger.success('Customer can track driver', `Can track: ${canTrack}`);
      
      // Test stop sharing
      await trackingService.stopSharingWithCustomer(driverId, customerId);
      logger.success('Stopped sharing successfully');
      
    } catch (error) {
      logger.error('Test failed', error.message || 'Unknown error');
    }
  };

  // Check for existing test data on mount
  useEffect(() => {
    checkFirebaseData();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Location Sharing Test</h1>
        <p className="text-muted-foreground">
          Test if location sharing works between driver app and Firebase
        </p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">HTTPS Connection</span>
                <Badge variant={isHTTPS ? "default" : "destructive"}>
                  {isHTTPS ? '✅ Secure' : '❌ Not Secure'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Geolocation API</span>
                <Badge variant={navigator.geolocation ? "default" : "destructive"}>
                  {navigator.geolocation ? '✅ Available' : '❌ Not Available'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Location Permission</span>
                <Badge variant={
                  locationPermission === 'granted' ? "default" : 
                  locationPermission === 'denied' ? "destructive" : "secondary"
                }>
                  {locationPermission === 'granted' ? '✅ Granted' : 
                   locationPermission === 'denied' ? '❌ Denied' : '⚠️ Prompt'}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Test Vehicle ID</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {testVehicleId}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Firebase Path</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  vehicleLocations/{testVehicleId}
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Run Location Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={runCompleteTest}
              disabled={isTesting}
              className="bg-primary hover:bg-primary/90"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Complete Test'
              )}
            </Button>
            
            <Button 
              onClick={checkFirebaseData}
              variant="outline"
            >
              Check Firebase Data
            </Button>
            
            <Button 
              onClick={testLocationSharing}
              variant="outline"
              className="bg-purple-50 text-purple-600 hover:bg-purple-100"
            >
              Test Location Sharing
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="ghost"
            >
              Refresh Page
            </Button>
          </div>

          {!isHTTPS && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Geolocation requires HTTPS. Please run this on HTTPS or localhost.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Results */}
        <Card>
          <CardHeader>
            <CardTitle>Location Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : location ? (
              <div className="space-y-3">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Location successfully obtained
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Latitude:</span>
                    <code className="font-mono">{location.coords.latitude.toFixed(6)}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Longitude:</span>
                    <code className="font-mono">{location.coords.longitude.toFixed(6)}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span>{location.coords.accuracy.toFixed(1)} meters</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Altitude:</span>
                    <span>{location.coords.altitude ? location.coords.altitude.toFixed(1) + 'm' : 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Speed:</span>
                    <span>{location.coords.speed ? location.coords.speed.toFixed(1) + ' m/s' : 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span>{new Date(location.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No location data yet. Click "Run Complete Test" to start.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Firebase Results */}
        <Card>
          <CardHeader>
            <CardTitle>Firebase Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {firebaseStatus.status !== 'idle' && (
              <Alert variant={
                firebaseStatus.status === 'success' ? 'default' :
                firebaseStatus.status === 'error' ? 'destructive' : 'default'
              } className={
                firebaseStatus.status === 'success' ? 'bg-green-50 border-green-200' : ''
              }>
                {firebaseStatus.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : firebaseStatus.status === 'error' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <AlertDescription>{firebaseStatus.message}</AlertDescription>
              </Alert>
            )}

            {firebaseData ? (
              <div className="space-y-3">
                <div className="text-sm font-medium">Data in Firebase:</div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(firebaseData, null, 2)}
                </pre>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(firebaseData.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No Firebase data found for test vehicle.</p>
                <p className="text-sm mt-1">Run the test to add data to Firebase.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">If location fails:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Allow location access when browser prompts</li>
                  <li>Ensure location services are enabled on device</li>
                  <li>Try in Chrome (best geolocation support)</li>
                  <li>Check if VPN/proxy blocks geolocation</li>
                  <li>Try different network (switch Wi-Fi/mobile)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">If Firebase fails:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Check Firebase Console → Realtime Database</li>
                  <li>Verify Firebase rules allow writes</li>
                  <li>Check browser console for Firebase errors</li>
                  <li>Ensure Firebase config is correct</li>
                  <li>Check internet connection</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Quick Links:</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
                >
                  Firebase Console
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => logger.info('Test Vehicle ID', testVehicleId)}
                >
                  Log Test ID
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}/track/${testVehicleId}`;
                    window.open(url, '_blank');
                  }}
                >
                  Test Tracking Page
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
