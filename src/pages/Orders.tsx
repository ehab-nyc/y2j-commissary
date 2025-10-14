import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Trash2, Edit, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  box_size: string;
  product_id: string;
  order_id: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  order_items: OrderItem[];
}

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
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
      .eq('customer_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const deleteOrderItem = async (itemId: string, orderId: string) => {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to delete item');
      return;
    }

    // Check if order has any remaining items
    const { data: remainingItems } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

    // If no items left, delete the order
    if (!remainingItems || remainingItems.length === 0) {
      await supabase.from('orders').delete().eq('id', orderId);
      toast.success('Order deleted (no items remaining)');
    } else {
      // Recalculate order total
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price')
        .eq('order_id', orderId);
      
      const newTotal = items?.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0;
      
      await supabase
        .from('orders')
        .update({ total: newTotal })
        .eq('id', orderId);
      
      toast.success('Item removed from order');
    }

    fetchOrders();
  };

  const editOrderItem = async (item: OrderItem, orderId: string) => {
    // Verify order is still in pending status before allowing edit
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      toast.error('Failed to load order details');
      return;
    }

    if (order.status !== 'pending') {
      toast.error('Cannot edit orders that are being processed or completed');
      return;
    }

    // Store single item in localStorage to repopulate cart
    const cartItem = {
      productId: item.product_id,
      quantity: item.quantity,
      boxSize: item.box_size,
    };
    
    localStorage.setItem('editOrderCart', JSON.stringify([cartItem]));
    localStorage.setItem('editOrderId', orderId);
    localStorage.setItem('editOrderItemId', item.id);
    localStorage.setItem('keepOrderId', 'true'); // Flag to keep same order
    
    toast.success('Redirecting to edit item...');
    navigate('/products');
  };

  const deleteOrder = async (orderId: string) => {
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      toast.error('Failed to delete order items');
      return;
    }

    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      toast.error('Failed to delete order');
      return;
    }

    toast.success('Order deleted successfully');
    fetchOrders();
  };

  const handleNotesEdit = (orderId: string, currentNotes: string | null) => {
    setEditingNotes(orderId);
    setNotesText(currentNotes || '');
  };

  const saveNotes = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ notes: notesText })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to save notes');
      return;
    }

    toast.success('Notes saved successfully');
    setEditingNotes(null);
    fetchOrders();
  };

  const cancelNotesEdit = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track your order history and status</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">You haven't placed any orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
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
                      {order.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-1">
                              <Trash2 className="w-3 h-3" />
                              Delete Order
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entire Order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this order and all its items.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(order.id)}>
                                Delete Order
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
                        {order.status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.products.name}</TableCell>
                          <TableCell>{item.box_size || '1 box'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                          {order.status === 'pending' && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => editOrderItem(item, order.id)}
                                  className="gap-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-1">
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Item?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {item.products.name} from your order.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteOrderItem(item.id, order.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                
                {/* Order Notes Section */}
                <CardContent className="border-t pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Order Notes
                      </h4>
                      {editingNotes !== order.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNotesEdit(order.id, order.notes)}
                        >
                          {order.notes ? 'Edit Notes' : 'Add Notes'}
                        </Button>
                      )}
                    </div>
                    
                    {editingNotes === order.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add any special instructions or notes for your order..."
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(order.id)}>
                            Save Notes
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelNotesEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {order.notes || 'No notes added'}
                      </div>
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

export default Orders;
