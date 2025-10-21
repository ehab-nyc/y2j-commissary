import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, FileText, Wrench, Users, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';

const POS = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Inventory',
      description: 'Manage products and stock levels',
      icon: Package,
      path: '/inventory',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Orders',
      description: 'View and process customer orders',
      icon: ShoppingCart,
      path: '/orders',
      roles: ['customer', 'worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Purchase Orders',
      description: 'Manage supplier orders',
      icon: ShoppingCart,
      path: '/purchase-orders',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'Customers',
      description: 'View and manage customers',
      icon: Users,
      path: '/customers',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'Analytics',
      description: 'View sales and performance metrics',
      icon: BarChart3,
      path: '/analytics',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'Stock Take',
      description: 'Perform inventory counts',
      icon: ClipboardList,
      path: '/stock-take',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Time Clock',
      description: 'Employee shift management',
      icon: Clock,
      path: '/employee-shifts',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Receipt Settings',
      description: 'Configure receipt templates',
      icon: FileText,
      path: '/receipt-settings',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'Hardware Setup',
      description: 'Configure POS hardware',
      icon: Wrench,
      path: '/hardware-setup',
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
          <h1 className="text-3xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground">Manage all POS operations in one place</p>
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

export default POS;
