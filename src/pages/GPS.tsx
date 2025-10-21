import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Truck, History, MapPin, Settings, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';

const GPS = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Live Fleet Map',
      description: 'Real-time tracking of all vehicles',
      icon: Map,
      path: '/gps/fleet-map',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Fleet Vehicles',
      description: 'Manage vehicles and GPS devices',
      icon: Truck,
      path: '/gps/vehicles',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'Route History',
      description: 'View historical routes and trips',
      icon: History,
      path: '/gps/history',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'Geofencing',
      description: 'Manage zones and alerts',
      icon: MapPin,
      path: '/gps/geofencing',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'GPS Alerts',
      description: 'View geofence and speed alerts',
      icon: Bell,
      path: '/gps/alerts',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'GPS Settings',
      description: 'Configure tracking and API keys',
      icon: Settings,
      path: '/gps/settings',
      roles: ['admin', 'super_admin']
    },
  ];

  const availableSections = sections.filter(section =>
    section.roles.some(role => hasRole(role as any))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">GPS Fleet Tracking</h1>
          <p className="text-muted-foreground">Monitor and manage your fleet in real-time</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GPS;
