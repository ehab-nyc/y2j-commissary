import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(email, full_name, cart_name, cart_number),
        assigned_worker:profiles!orders_assigned_worker_id_fkey(full_name, email),
        order_items(
          *,
          box_size,
          products(name, price)
        )
      `)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'ready': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">View and manage all orders</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cart</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  {order.profiles?.full_name || order.profiles?.email}
                </TableCell>
                <TableCell>
                  {order.profiles?.cart_name || 'N/A'} {order.profiles?.cart_number ? `#${order.profiles.cart_number}` : ''}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>${Number(order.total).toFixed(2)}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Box Size</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.order_items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.box_size || '1 box'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${Number(item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-lg font-bold text-right">
                    Total: ${Number(selectedOrder.total).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;
