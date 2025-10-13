import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';

const Manager = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('status, total');

      const { data: products } = await supabase
        .from('products')
        .select('quantity')
        .lt('quantity', 10);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const totalRevenue = orders?.filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const lowStockProducts = products?.length || 0;

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        lowStockProducts,
      });
    } catch (error) {
      toast.error('Failed to load statistics');
    }
    setLoading(false);
  };

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Completed Orders',
      value: stats.completedOrders,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Management Dashboard</h1>
          <p className="text-muted-foreground">Overview of commissary operations</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title} className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-full ${stat.bgColor}`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {stats.lowStockProducts > 0 && (
              <Card className="border-yellow-200 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <Package className="w-5 h-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {stats.lowStockProducts} product(s) have low stock (less than 10 units).
                    Please review inventory levels.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Manager;
