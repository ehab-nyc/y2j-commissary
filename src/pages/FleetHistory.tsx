import React, { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MapComponent from '@/components/MapComponent';
import { toast } from 'sonner';

const FleetHistory = () => {
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [routeData, setRouteData] = useState<any[]>([]);

  React.useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('name');
    
    if (data) setVehicles(data);
  };

  const loadRoute = async () => {
    if (!selectedVehicle || !date) {
      toast.error('Please select a vehicle and date');
      return;
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from('location_history')
      .select('*')
      .eq('vehicle_id', selectedVehicle)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
      .order('timestamp');

    if (data) {
      setRouteData(data);
      if (data.length === 0) {
        toast.info('No location data found for this date');
      }
    }
  };

  const markers = routeData.map((loc, index) => ({
    id: `${loc.id}-${index}`,
    lng: typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : Number(loc.longitude),
    lat: typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : Number(loc.latitude),
    label: `${format(new Date(loc.timestamp), 'HH:mm:ss')} - ${loc.speed || 0} mph`,
    color: index === 0 ? '#22c55e' : index === routeData.length - 1 ? '#ef4444' : '#3b82f6'
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div>
          <h1 className="text-3xl font-bold">Route History</h1>
          <p className="text-muted-foreground">View historical routes and trips</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.vehicle_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button onClick={loadRoute} className="w-full">
                  Load Route
                </Button>
              </div>
            </div>

            {routeData.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Showing {routeData.length} location points from {format(new Date(routeData[0].timestamp), 'HH:mm')} to{' '}
                {format(new Date(routeData[routeData.length - 1].timestamp), 'HH:mm')}
              </div>
            )}
          </CardContent>
        </Card>

        {routeData.length > 0 && (
          <div className="h-[600px]">
            <MapComponent 
              markers={markers}
              center={markers.length > 0 ? [markers[0].lng, markers[0].lat] : undefined}
              zoom={13}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FleetHistory;
