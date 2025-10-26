import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle2, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortField = 'updated_at' | 'total' | 'customer';
type SortDirection = 'asc' | 'desc';

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    cart_name: string | null;
    cart_number: string | null;
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

const ProcessedOrders = () => {
  const [processedOrders, setProcessedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchProcessedOrders();
  }, []);

  const fetchProcessedOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(full_name, email, cart_name, cart_number),
        order_items(
          quantity,
          price,
          box_size,
          products(name)
        )
      `)
      .eq('assigned_worker_id', user.id)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Failed to load processed orders');
    } else {
      setProcessedOrders(data as Order[] || []);
    }
    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOrders = [...processedOrders].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'updated_at') {
      comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    } else if (sortField === 'total') {
      comparison = a.total - b.total;
    } else if (sortField === 'customer') {
      const nameA = a.profiles?.full_name || '';
      const nameB = b.profiles?.full_name || '';
      comparison = nameA.localeCompare(nameB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            My Processed Orders
          </h1>
          <p className="text-muted-foreground">View your order processing history</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : processedOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No processed orders yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('updated_at')}
                className="gap-1"
              >
                Completed Date <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('customer')}
                className="gap-1"
              >
                Customer <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSort('total')}
                className="gap-1"
              >
                Total <ArrowUpDown className="w-3 h-3" />
              </Button>
            </div>
            {sortedOrders.map(order => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || 'Unknown'} ({order.profiles?.email || 'N/A'})
                      </CardDescription>
                      {(order.profiles?.cart_name || order.profiles?.cart_number) && (
                        <CardDescription>
                          Cart: {order.profiles?.cart_name || ''} {order.profiles?.cart_number || ''}
                        </CardDescription>
                      )}
                      <CardDescription>
                        Completed: {format(new Date(order.updated_at), 'PPp')}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProcessedOrders;
