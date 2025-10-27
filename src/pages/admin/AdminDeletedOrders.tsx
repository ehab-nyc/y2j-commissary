import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const AdminDeletedOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [serviceFee, setServiceFee] = useState<number>(10);

  useEffect(() => {
    fetchDeletedOrders();
    fetchServiceFee();
  }, []);

  const fetchServiceFee = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'service_fee')
      .single();
    
    if (data) {
      setServiceFee(parseFloat(data.value) || 10);
    }
  };

  const fetchDeletedOrders = async () => {
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
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    setOrders(data || []);
  };

  const handleRestoreOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to restore this order?')) {
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: null })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to restore order');
      console.error(error);
    } else {
      toast.success('Order restored successfully');
      fetchDeletedOrders();
    }
  };

  const handleHardDelete = async (orderId: string) => {
    if (!confirm('⚠️ PERMANENT DELETE: This will permanently remove this order from the database. This action CANNOT be undone. Are you absolutely sure?')) {
      return;
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to permanently delete order');
      console.error(error);
    } else {
      toast.success('Order permanently deleted');
      fetchDeletedOrders();
    }
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
          <h1 className="text-3xl font-bold">Deleted Orders</h1>
          <p className="text-muted-foreground">View archived orders - restore or permanently delete them</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">No deleted orders found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cart</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Deleted Date</TableHead>
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
                  <TableCell>{new Date(order.deleted_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDialog(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRestoreOrder(order.id)}
                        title="Restore Order"
                      >
                        <RotateCcw className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleHardDelete(order.id)}
                        title="Permanently Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details (Deleted)</DialogTitle>
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
                  <div>
                    <p className="text-sm text-muted-foreground">Deleted Date</p>
                    <p className="font-medium">{new Date(selectedOrder.deleted_at).toLocaleString()}</p>
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
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${(Number(selectedOrder.total) - serviceFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee:</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>${Number(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDeletedOrders;