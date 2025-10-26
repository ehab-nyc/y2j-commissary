import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Folder, ClipboardList, CheckCircle2, AlertCircle, Users, MessageSquare, Settings, MapPin, Megaphone, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AdminHub = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const sections = [
    {
      title: 'Products',
      description: 'Manage product inventory',
      icon: Package,
      path: '/admin/products',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Categories',
      description: 'Manage product categories',
      icon: Folder,
      path: '/admin/categories',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'Orders',
      description: 'View and manage orders',
      icon: ClipboardList,
      path: '/admin/orders',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Processed Orders',
      description: 'View completed orders',
      icon: CheckCircle2,
      path: '/admin/processed-orders',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Deleted Orders',
      description: 'Restore or permanently delete orders',
      icon: Trash2,
      path: '/admin/deleted-orders',
      roles: ['super_admin']
    },
    {
      title: 'Violations',
      description: 'View customer violations',
      icon: AlertCircle,
      path: '/admin/violations',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Users',
      description: 'Manage user accounts and roles',
      icon: Users,
      path: '/admin/users',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'Weekly Balances',
      description: 'Manage customer weekly balances and fees',
      icon: Users,
      path: '/admin/balances',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'Cart Assignments',
      description: 'Assign customers to owners',
      icon: Users,
      path: '/admin/cart-assignments',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'SMS',
      description: 'Send bulk SMS notifications',
      icon: MessageSquare,
      path: '/admin/sms',
      roles: ['manager', 'admin', 'super_admin']
    },
    {
      title: 'GPS Fleet Management',
      description: 'Track vehicles and manage fleet',
      icon: MapPin,
      path: '/gps',
      roles: ['worker', 'manager', 'admin', 'super_admin']
    },
    {
      title: 'Announcements',
      description: 'Manage system-wide announcements',
      icon: Megaphone,
      path: '/admin/announcements',
      roles: ['admin', 'super_admin']
    },
    {
      title: 'Branding & Settings',
      description: 'Configure app branding and settings',
      icon: Settings,
      path: '/admin/settings',
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
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage products, users, and app settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {availableSections.map((section) => (
            <Card
              key={section.path}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(section.path)}
            >
              <CardHeader>
                <section.icon className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminHub;
