import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowUpDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PrintReceiptDialog } from '@/components/receipts/PrintReceiptDialog';

type SortField = 'created_at' | 'status' | 'total' | 'customer' | 'cart';
type SortDirection = 'asc' | 'desc';

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [serviceFee, setServiceFee] = useState<number>(10);

  useEffect(() => {
    fetchOrders();
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
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'created_at') {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === 'total') {
      comparison = a.total - b.total;
    } else if (sortField === 'customer') {
      const nameA = a.profiles?.full_name || a.profiles?.email || '';
      const nameB = b.profiles?.full_name || b.profiles?.email || '';
      comparison = nameA.localeCompare(nameB);
    } else if (sortField === 'cart') {
      const cartA = a.profiles?.cart_name || a.profiles?.cart_number || '';
      const cartB = b.profiles?.cart_name || b.profiles?.cart_number || '';
      comparison = cartA.localeCompare(cartB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to archive this order? You can permanently delete it later from Deleted Orders.')) {
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to archive order');
      console.error(error);
    } else {
      toast.success('Order archived successfully');
      fetchOrders();
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
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">View and manage all orders</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('created_at')}
            className="gap-1"
          >
            Date <ArrowUpDown className="w-3 h-3" />
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
            onClick={() => handleSort('cart')}
            className="gap-1"
          >
            Cart <ArrowUpDown className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('status')}
            className="gap-1"
          >
            Status <ArrowUpDown className="w-3 h-3" />
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
            {sortedOrders.map((order) => (
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
                  <div className="flex gap-2">
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
                    <PrintReceiptDialog
                      orderNumber={order.id}
                      customerName={order.profiles?.full_name || order.profiles?.email || 'Customer'}
                      items={order.order_items?.map((item: any) => ({
                        name: item.products?.name || 'Unknown',
                        quantity: item.quantity,
                        price: item.price,
                        box_size: item.box_size,
                      })) || []}
                      total={order.total}
                      serviceFee={serviceFee}
                      date={new Date(order.created_at)}
                      cartName={order.profiles?.cart_name}
                      cartNumber={order.profiles?.cart_number}
                      processedBy={order.assigned_worker?.full_name}
                      onPOSPrint={() => window.print()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
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

export default AdminOrders;
