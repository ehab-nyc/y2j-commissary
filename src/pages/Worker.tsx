import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Printer } from 'lucide-react';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_id: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  order_items: Array<{
    quantity: number;
    price: number;
    box_size: string;
    products: {
      name: string;
    } | null;
  }>;
}

const Worker = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  useEffect(() => {
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
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(full_name, email),
        order_items(
          quantity,
          price,
          box_size,
          products(name)
        )
      `)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders(data as Order[] || []);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.order_items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.products?.name || 'Unknown'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.box_size || '1 box'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

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
              position: relative;
            }
            body::before {
              content: '';
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 800px;
              height: 800px;
              background-image: url('${logoUrl}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.08;
              z-index: -1;
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
              max-height: 100px;
              max-width: 200px;
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
            <strong>Customer:</strong> ${order.profiles?.full_name || 'Unknown'}<br/>
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
                <td style="padding: 15px 8px; text-align: right;">$${order.total.toFixed(2)}</td>
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders Queue</h1>
          <p className="text-muted-foreground">Process and manage customer orders</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending orders to process</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || 'Unknown'} ({order.profiles?.email || 'N/A'})
                      </CardDescription>
                      <CardDescription>
                        {format(new Date(order.created_at), 'PPp')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <span className="text-lg font-bold text-primary">
                        ${order.total.toFixed(2)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printOrder(order)}
                        className="gap-1"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
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
                      {order.order_items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.products?.name || 'Unknown'}</TableCell>
                          <TableCell>{item.box_size}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {order.notes && (
                    <div className="p-4 border-t bg-muted/30">
                      <div className="text-sm font-medium mb-1">Customer Notes:</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {order.notes}
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-muted/50 flex gap-2">
                    {order.status === 'pending' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'processing')}
                        className="flex-1"
                      >
                        Start Processing
                      </Button>
                    )}
                    {order.status === 'processing' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                        className="flex-1 bg-accent hover:bg-accent/90"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Worker;
