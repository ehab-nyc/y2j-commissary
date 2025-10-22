import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import MapComponent from '@/components/MapComponent';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Navigation, Activity } from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  vehicle_number: string;
  tracking_type: string;
  status: string;
  latest_location?: {
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: string;
  };
}

const FleetMap = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
    
    // Subscribe to real-time location updates
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_history'
        },
        (payload) => {
          console.log('New location update:', payload);
          fetchVehicles(); // Refresh vehicle data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVehicles = async () => {
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'active');

    if (vehiclesData) {
      // Get latest location for each vehicle
      const vehiclesWithLocation = await Promise.all(
        vehiclesData.map(async (vehicle) => {
          const { data: location } = await supabase
            .from('location_history')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...vehicle,
            latest_location: location ? {
              latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : Number(location.latitude),
              longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : Number(location.longitude),
              speed: location.speed ? (typeof location.speed === 'string' ? parseFloat(location.speed) : Number(location.speed)) : 0,
              timestamp: location.timestamp
            } : undefined
          };
        })
      );

      setVehicles(vehiclesWithLocation);
    }
  };

  const markers = vehicles
    .filter(v => v.latest_location)
    .map(v => ({
      id: v.id,
      lng: v.latest_location!.longitude,
      lat: v.latest_location!.latitude,
      label: `${v.name} (${v.vehicle_number})`,
      color: v.tracking_type === 'gps_device' ? '#3b82f6' : '#10b981'
    }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'maintenance': return 'destructive';
      default: return 'outline';
    }
  };

  const getTrackingTypeLabel = (type: string) => {
    switch (type) {
      case 'gps_device': return 'GPS Device';
      case 'mobile_app': return 'Mobile App';
      case 'both': return 'Both';
      default: return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 h-[calc(100vh-6rem)]">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div>
          <h1 className="text-3xl font-bold">Live Fleet Map</h1>
          <p className="text-muted-foreground">Real-time tracking of all vehicles</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Map */}
          <div className="lg:col-span-3 h-[600px] lg:h-full">
            <MapComponent 
              markers={markers}
              center={markers.length > 0 ? [markers[0].lng, markers[0].lat] : undefined}
            />
          </div>

          {/* Vehicle List */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[600px] lg:max-h-full">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Active Vehicles ({vehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active vehicles</p>
                ) : (
                  vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                        selectedVehicle?.id === vehicle.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{vehicle.name}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.vehicle_number}</p>
                          </div>
                          <Badge variant={getStatusColor(vehicle.status)}>
                            {vehicle.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          {getTrackingTypeLabel(vehicle.tracking_type)}
                        </div>

                        {vehicle.latest_location && (
                          <>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Navigation className="h-3 w-3" />
                              {vehicle.latest_location.speed.toFixed(0)} mph
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Updated: {new Date(vehicle.latest_location.timestamp).toLocaleTimeString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FleetMap;
