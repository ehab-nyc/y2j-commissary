import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  name: string;
  vehicle_number: string;
  type: string;
  tracking_type: string;
  device_id: string | null;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  license_plate: string | null;
}

const FleetVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('name');
    
    if (data) setVehicles(data);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const vehicleData = {
      name: formData.get('name') as string,
      vehicle_number: formData.get('vehicle_number') as string,
      type: formData.get('type') as string,
      tracking_type: formData.get('tracking_type') as string,
      device_id: formData.get('device_id') as string || null,
      status: formData.get('status') as string,
      make: formData.get('make') as string || null,
      model: formData.get('model') as string || null,
      year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
      license_plate: formData.get('license_plate') as string || null,
    };

    if (editingVehicle) {
      const { error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', editingVehicle.id);
      
      if (error) {
        toast.error('Failed to update vehicle');
      } else {
        toast.success('Vehicle updated successfully');
      }
    } else {
      const { error } = await supabase
        .from('vehicles')
        .insert(vehicleData);
      
      if (error) {
        toast.error('Failed to add vehicle');
      } else {
        toast.success('Vehicle added successfully');
      }
    }

    setShowDialog(false);
    setEditingVehicle(null);
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete vehicle');
    } else {
      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/gps" label="Back to GPS Hub" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fleet Vehicles</h1>
            <p className="text-muted-foreground">Manage your fleet and GPS devices</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingVehicle(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                <DialogDescription>
                  Configure vehicle details and tracking settings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Vehicle Name *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      defaultValue={editingVehicle?.name}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                    <Input 
                      id="vehicle_number" 
                      name="vehicle_number" 
                      defaultValue={editingVehicle?.vehicle_number}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select name="type" defaultValue={editingVehicle?.type || 'truck'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="van">Van</SelectItem>
                        <SelectItem value="car">Car</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking_type">Tracking Type *</Label>
                    <Select name="tracking_type" defaultValue={editingVehicle?.tracking_type || 'mobile_app'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gps_device">GPS Device</SelectItem>
                        <SelectItem value="mobile_app">Mobile App</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device_id">GPS Device ID</Label>
                    <Input 
                      id="device_id" 
                      name="device_id" 
                      defaultValue={editingVehicle?.device_id || ''}
                      placeholder="For GPS hardware tracking"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select name="status" defaultValue={editingVehicle?.status || 'active'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input 
                      id="make" 
                      name="make" 
                      defaultValue={editingVehicle?.make || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input 
                      id="model" 
                      name="model" 
                      defaultValue={editingVehicle?.model || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input 
                      id="year" 
                      name="year" 
                      type="number"
                      defaultValue={editingVehicle?.year || ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_plate">License Plate</Label>
                    <Input 
                      id="license_plate" 
                      name="license_plate" 
                      defaultValue={editingVehicle?.license_plate || ''}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingVehicle ? 'Update' : 'Add'} Vehicle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vehicles ({vehicles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Vehicle #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.name}</TableCell>
                    <TableCell>{vehicle.vehicle_number}</TableCell>
                    <TableCell className="capitalize">{vehicle.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {vehicle.tracking_type === 'gps_device' ? 'GPS Device' : 
                         vehicle.tracking_type === 'mobile_app' ? 'Mobile App' : 'Both'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        vehicle.status === 'active' ? 'default' :
                        vehicle.status === 'maintenance' ? 'destructive' : 'secondary'
                      }>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(vehicle.id)}
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

export default FleetVehicles;
