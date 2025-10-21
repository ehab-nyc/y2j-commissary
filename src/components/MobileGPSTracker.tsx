import React, { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MobileGPSTrackerProps {
  vehicleId: string;
}

export const MobileGPSTracker: React.FC<MobileGPSTrackerProps> = ({ vehicleId }) => {
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<any>(null);

  useEffect(() => {
    let watchId: string | null = null;

    const startTracking = async () => {
      if (!tracking) return;

      try {
        watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          },
          async (position, err) => {
            if (err) {
              console.error('GPS error:', err);
              return;
            }

            if (position) {
              const locationData = {
                vehicle_id: vehicleId,
                tracking_source: 'mobile',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
                altitude: position.coords.altitude || 0,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString()
              };

              await supabase
                .from('location_history')
                .insert(locationData);

              setLastLocation(locationData);
            }
          }
        );
      } catch (error) {
        console.error('Failed to start tracking:', error);
        toast.error('Failed to start GPS tracking');
        setTracking(false);
      }
    };

    startTracking();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, [tracking, vehicleId]);

  const handleStartTracking = async () => {
    const permission = await Geolocation.checkPermissions();
    
    if (permission.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') {
        toast.error('GPS permission denied');
        return;
      }
    }

    setTracking(true);
    toast.success('GPS tracking started');
  };

  const handleStopTracking = () => {
    setTracking(false);
    toast.info('GPS tracking stopped');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Mobile GPS Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Tracking Status</p>
            <Badge variant={tracking ? 'default' : 'secondary'}>
              {tracking ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {!tracking ? (
            <Button onClick={handleStartTracking}>
              Start Tracking
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleStopTracking}>
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}
        </div>

        {lastLocation && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Last Update: {new Date(lastLocation.timestamp).toLocaleTimeString()}</p>
            <p>Speed: {lastLocation.speed.toFixed(1)} mph</p>
            <p>Accuracy: {lastLocation.accuracy.toFixed(0)}m</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
