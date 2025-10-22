import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GeofenceAlert {
  id: string;
  vehicle_id: string;
  geofence_id: string;
  alert_type: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  acknowledged: boolean;
  vehicles: {
    name: string;
    vehicle_number: string;
  };
  geofences: {
    name: string;
  };
}

const GPSAlerts = () => {
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time alerts
    const channel = supabase
      .channel('geofence-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'geofence_alerts'
        },
        () => {
          fetchAlerts();
          toast.info('New geofence alert received');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('geofence_alerts')
      .select(`
        *,
        vehicles:vehicle_id(name, vehicle_number),
        geofences:geofence_id(name)
      `)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (data) setAlerts(data as any);
  };

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase
      .from('geofence_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to acknowledge alert');
    } else {
      toast.success('Alert acknowledged');
      fetchAlerts();
    }
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div>
          <h1 className="text-3xl font-bold">GPS Alerts</h1>
          <p className="text-muted-foreground">Geofence and tracking alerts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alerts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{unacknowledgedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{alerts.length - unacknowledgedCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Geofence</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        {format(new Date(alert.timestamp), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.vehicles.name}</p>
                          <p className="text-sm text-muted-foreground">{alert.vehicles.vehicle_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>{alert.geofences.name}</TableCell>
                      <TableCell>
                        <Badge variant={alert.alert_type === 'enter' ? 'default' : 'secondary'}>
                          {alert.alert_type === 'enter' ? 'Entered' : 'Exited'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Acknowledged
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GPSAlerts;
