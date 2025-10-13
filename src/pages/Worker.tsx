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

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  order_items: Array<{
    quantity: number;
    price: number;
    products: {
      name: string;
    } | null;
  }>;
}

const Worker = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(full_name, email),
        order_items(
          quantity,
          price,
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
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <span className="text-lg font-bold text-primary">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.products?.name || 'Unknown'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
