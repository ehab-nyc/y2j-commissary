import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Folder, ClipboardList, CheckCircle2, AlertCircle, Users, MessageSquare, Settings } from 'lucide-react';

const AdminHub = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Products',
      description: 'Manage product inventory',
      icon: Package,
      path: '/admin/products',
    },
    {
      title: 'Categories',
      description: 'Manage product categories',
      icon: Folder,
      path: '/admin/categories',
    },
    {
      title: 'Orders',
      description: 'View and manage orders',
      icon: ClipboardList,
      path: '/admin/orders',
    },
    {
      title: 'Processed Orders',
      description: 'View completed orders',
      icon: CheckCircle2,
      path: '/admin/processed-orders',
    },
    {
      title: 'Violations',
      description: 'View customer violations',
      icon: AlertCircle,
      path: '/admin/violations',
    },
    {
      title: 'Users',
      description: 'Manage user accounts and roles',
      icon: Users,
      path: '/admin/users',
    },
    {
      title: 'SMS',
      description: 'Send bulk SMS notifications',
      icon: MessageSquare,
      path: '/admin/sms',
    },
    {
      title: 'Branding & Settings',
      description: 'Configure app branding and settings',
      icon: Settings,
      path: '/admin/settings',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage products, users, and app settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sections.map((section) => (
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
