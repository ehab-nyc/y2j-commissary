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
import { CheckCircle2, Clock } from 'lucide-react';
import { PrintReceiptDialog } from '@/components/receipts/PrintReceiptDialog';

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
    cart_name: string | null;
    cart_number: string | null;
  } | null;
  assigned_worker?: {
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
        profiles!orders_customer_id_fkey(full_name, email, cart_name, cart_number),
        assigned_worker:profiles!orders_assigned_worker_id_fkey(full_name, email),
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
    const { data: { user } } = await supabase.auth.getUser();
    
    const updateData: any = { status: newStatus };
    if ((newStatus === 'processing' || newStatus === 'completed') && user) {
      updateData.assigned_worker_id = user.id;
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
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
              @page { 
                margin: 0;
                size: 8.5in 11in;
              }
              body {
                margin: 0.25in;
                padding: 0;
              }
              /* Hide browser print headers/footers */
              html {
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 8in;
              margin: 0 auto;
              padding: 20px;
              position: relative;
              font-size: 11px;
              background: white;
            }
            body::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 40%;
              height: 40%;
              background-image: url('${logoUrl}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.05;
              z-index: 0;
              pointer-events: none;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 25px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
              position: relative;
              z-index: 1;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo {
              max-height: 70px;
              max-width: 140px;
            }
            .company-name {
              font-size: 16px;
              font-weight: bold;
            }
            .order-info {
              text-align: right;
              font-size: 11px;
            }
            .order-info h2 {
              font-size: 16px;
              margin: 0 0 8px 0;
            }
            .customer-info {
              margin: 15px 0;
              padding: 12px;
              background-color: #f9fafb;
              border-left: 4px solid #000;
              position: relative;
              z-index: 1;
            }
            .customer-info > div {
              margin: 4px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 11px;
              position: relative;
              z-index: 1;
            }
            th {
              background-color: #f3f4f6;
              padding: 10px;
              text-align: left;
              border-bottom: 2px solid #000;
              font-size: 11px;
              font-weight: 600;
            }
            td {
              padding: 8px 10px;
            }
            .total-row {
              font-weight: bold;
              font-size: 13px;
              background-color: #f9fafb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
              <div>
                <div class="company-name">${companyName}</div>
                ${companyAddress ? `<div style="font-size: 10px; margin-top: 4px;">${companyAddress}</div>` : ''}
                ${companyEmail ? `<div style="font-size: 10px; margin-top: 3px;">${companyEmail}</div>` : ''}
              </div>
            </div>
            <div class="order-info">
              <h2>Invoice #${order.id.slice(0, 8)}</h2>
              <p>${format(new Date(order.created_at), 'PPp')}</p>
              <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
          </div>
          
          <div class="customer-info">
            <div><strong>Customer:</strong> ${order.profiles?.full_name || 'Unknown'}</div>
            ${order.profiles?.cart_name || order.profiles?.cart_number ? `<div><strong>Cart:</strong> ${order.profiles?.cart_name || ''} ${order.profiles?.cart_number || ''}</div>` : ''}
            ${order.assigned_worker ? `<div><strong>Processed by:</strong> ${order.assigned_worker.full_name || order.assigned_worker.email}</div>` : ''}
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
                <td colspan="4" style="padding: 15px 10px; text-align: right; border-top: 2px solid #000;">TOTAL:</td>
                <td style="padding: 15px 10px; text-align: right; border-top: 2px solid #000;">$${order.total.toFixed(2)}</td>
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
      <div className="space-y-8">
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
                      {(order.profiles?.cart_name || order.profiles?.cart_number) && (
                        <CardDescription>
                          Cart: {order.profiles?.cart_name || ''} {order.profiles?.cart_number || ''}
                        </CardDescription>
                      )}
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
                      <PrintReceiptDialog
                        orderNumber={order.id.slice(0, 8)}
                        customerName={order.profiles?.full_name || 'N/A'}
                        items={order.order_items.map(item => ({
                          name: item.products?.name || 'Unknown',
                          quantity: item.quantity,
                          price: item.price,
                          box_size: item.box_size,
                        }))}
                        total={order.total}
                        serviceFee={0}
                        date={new Date(order.created_at)}
                        cartName={order.profiles?.cart_name}
                        cartNumber={order.profiles?.cart_number}
                        processedBy={order.assigned_worker?.full_name || order.assigned_worker?.email}
                        onPOSPrint={() => printOrder(order)}
                      />
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
                  {order.assigned_worker && (
                    <div className="p-3 border-t bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        Processed by: <span className="font-medium text-foreground">{order.assigned_worker.full_name || order.assigned_worker.email}</span>
                      </p>
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
