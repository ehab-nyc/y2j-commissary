import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MapComponent from '@/components/MapComponent';

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius: number | null;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  active: boolean;
}

const Geofencing = () => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    const { data } = await supabase
      .from('geofences')
      .select('*')
      .order('name');
    
    if (data) setGeofences(data);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedLocation) {
      toast.error('Please select a location on the map');
      return;
    }
    
    const geofenceData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      type: 'circle',
      center_lat: selectedLocation.lat,
      center_lng: selectedLocation.lng,
      radius: parseFloat(formData.get('radius') as string),
      alert_on_enter: formData.get('alert_on_enter') === 'on',
      alert_on_exit: formData.get('alert_on_exit') === 'on',
      active: formData.get('active') === 'on',
    };

    if (editingGeofence) {
      const { error } = await supabase
        .from('geofences')
        .update(geofenceData)
        .eq('id', editingGeofence.id);
      
      if (error) {
        toast.error('Failed to update geofence');
      } else {
        toast.success('Geofence updated successfully');
      }
    } else {
      const { error } = await supabase
        .from('geofences')
        .insert(geofenceData);
      
      if (error) {
        toast.error('Failed to create geofence');
      } else {
        toast.success('Geofence created successfully');
      }
    }

    setShowDialog(false);
    setEditingGeofence(null);
    setSelectedLocation(null);
    fetchGeofences();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    const { error } = await supabase
      .from('geofences')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete geofence');
    } else {
      toast.success('Geofence deleted successfully');
      fetchGeofences();
    }
  };

  const geofenceMarkers = geofences
    .filter(g => g.center_lat && g.center_lng)
    .map(g => ({
      id: g.id,
      lng: typeof g.center_lng === 'number' ? g.center_lng : parseFloat(String(g.center_lng!)),
      lat: typeof g.center_lat === 'number' ? g.center_lat : parseFloat(String(g.center_lat!)),
      label: g.name,
      color: g.active ? '#10b981' : '#6b7280'
    }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Geofencing</h1>
            <p className="text-muted-foreground">Manage zones and alerts</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingGeofence(null);
                setSelectedLocation(null);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Geofence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGeofence ? 'Edit Geofence' : 'Create New Geofence'}</DialogTitle>
                <DialogDescription>
                  Click on the map to set the center point, then configure the zone settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="h-[300px] border rounded-lg overflow-hidden">
                  <MapComponent 
                    markers={selectedLocation ? [{
                      id: 'selected',
                      lng: selectedLocation.lng,
                      lat: selectedLocation.lat,
                      label: 'Geofence Center',
                      color: '#10b981'
                    }] : []}
                    onMapClick={(lng, lat) => setSelectedLocation({ lng, lat })}
                    center={selectedLocation ? [selectedLocation.lng, selectedLocation.lat] : undefined}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Zone Name *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      defaultValue={editingGeofence?.name}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="radius">Radius (meters) *</Label>
                    <Input 
                      id="radius" 
                      name="radius" 
                      type="number"
                      defaultValue={editingGeofence?.radius || 500}
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    defaultValue={editingGeofence?.description || ''}
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="alert_on_enter" 
                      name="alert_on_enter" 
                      defaultChecked={editingGeofence?.alert_on_enter}
                    />
                    <Label htmlFor="alert_on_enter">Alert on Enter</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="alert_on_exit" 
                      name="alert_on_exit" 
                      defaultChecked={editingGeofence?.alert_on_exit}
                    />
                    <Label htmlFor="alert_on_exit">Alert on Exit</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="active" 
                      name="active" 
                      defaultChecked={editingGeofence?.active !== false}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingGeofence ? 'Update' : 'Create'} Geofence
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="h-[400px]">
          <MapComponent markers={geofenceMarkers} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Geofences ({geofences.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {geofences.map((geofence) => (
                  <TableRow key={geofence.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{geofence.name}</p>
                        {geofence.description && (
                          <p className="text-sm text-muted-foreground">{geofence.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{geofence.radius}m</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {geofence.alert_on_enter && <Badge variant="outline">Enter</Badge>}
                        {geofence.alert_on_exit && <Badge variant="outline">Exit</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={geofence.active ? 'default' : 'secondary'}>
                        {geofence.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingGeofence(geofence);
                            if (geofence.center_lat && geofence.center_lng) {
                              setSelectedLocation({
                                lat: typeof geofence.center_lat === 'number' ? geofence.center_lat : parseFloat(String(geofence.center_lat)),
                                lng: typeof geofence.center_lng === 'number' ? geofence.center_lng : parseFloat(String(geofence.center_lng))
                              });
                            }
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(geofence.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Geofencing;
