import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TrendingUp, Package, Users, DollarSign, Eye, Printer, BarChart3, ClipboardList } from 'lucide-react';

const Manager = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  useEffect(() => {
    fetchStats();
    fetchOrders();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'logo_url', 'company_address', 'company_email']);
    
    if (data) {
      const nameEntry = data.find(s => s.key === 'company_name');
      const logoEntry = data.find(s => s.key === 'logo_url');
      const addressEntry = data.find(s => s.key === 'company_address');
      const emailEntry = data.find(s => s.key === 'company_email');
      setCompanyName(nameEntry?.value || 'Company');
      setLogoUrl(logoEntry?.value || '');
      setCompanyAddress(addressEntry?.value || '');
      setCompanyEmail(emailEntry?.value || '');
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(email, full_name),
        order_items(
          id,
          quantity,
          price,
          box_size,
          product_id,
          order_id,
          products(name)
        )
      `)
      .order('created_at', { ascending: false });
    
    setOrders(data || []);
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted';
    }
  };

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.order_items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.products?.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.box_size || '1 box'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.price).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * Number(item.price)).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.id.slice(0, 8)}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 20px;
            }
            @media print {
              body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-image: url('${logoUrl}');
                background-size: 400px;
                background-repeat: no-repeat;
                background-position: center center;
                opacity: 0.08;
                z-index: -1;
                pointer-events: none;
              }
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo {
              max-height: 60px;
              max-width: 120px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
            }
            .order-info {
              text-align: right;
            }
            .customer-info {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f9fafb;
              border-radius: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              border-bottom: 2px solid #000;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
            }
            .notes {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9fafb;
              border-left: 4px solid #000;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
              <div>
                <div class="company-name">${companyName}</div>
                ${companyAddress ? `<div style="font-size: 12px; margin-top: 5px;">${companyAddress}</div>` : ''}
                ${companyEmail ? `<div style="font-size: 12px; margin-top: 2px;">${companyEmail}</div>` : ''}
              </div>
            </div>
            <div class="order-info">
              <h2>Order #${order.id.slice(0, 8)}</h2>
              <p>${format(new Date(order.created_at), 'PPp')}</p>
              <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
          </div>
          
          <div class="customer-info">
            <strong>Customer:</strong> ${order.profiles?.full_name || 'N/A'}<br/>
            <strong>Email:</strong> ${order.profiles?.email || 'N/A'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Box Size</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="4" style="padding: 15px 8px; text-align: right;">TOTAL:</td>
                <td style="padding: 15px 8px; text-align: right;">$${Number(order.total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                All Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Orders</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map(order => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.profiles?.full_name || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{order.profiles?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.order_items?.length || 0} item(s)
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(order.total).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), 'PPp')}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-2 justify-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => printOrder(order)}
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowOrderDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
                        <DialogDescription>
                          Complete order information and items
                        </DialogDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedOrder && printOrder(selectedOrder)}
                        className="gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Order
                      </Button>
                    </div>
                  </DialogHeader>
                  {selectedOrder && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Customer</p>
                          <p className="font-medium">{selectedOrder.profiles?.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Order Date</p>
                          <p className="font-medium">{format(new Date(selectedOrder.created_at), 'PPp')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className={getStatusColor(selectedOrder.status)}>
                            {selectedOrder.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-primary">
                            ${Number(selectedOrder.total).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">Order Items</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Box Size</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrder.order_items?.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">{item.products?.name}</TableCell>
                                <TableCell>{item.box_size || '1 box'}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">${Number(item.price).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                  ${(item.quantity * Number(item.price)).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {selectedOrder.notes && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h3 className="font-semibold mb-2 text-sm">Customer Notes</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedOrder.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Manager;
