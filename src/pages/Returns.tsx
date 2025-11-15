import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RotateCcw, CheckCircle, XCircle, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ReturnItem {
  id: string;
  order_item_id: string;
  product_id: string;
  quantity_returned: number;
  price_per_unit: number;
  restock: boolean;
  condition: string;
  products: {
    name: string;
  };
}

interface Return {
  id: string;
  order_id: string;
  customer_id: string;
  return_date: string;
  reason: string;
  total_refund: number;
  status: string;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
  return_items: ReturnItem[];
}

interface Order {
  id: string;
  total: number;
  created_at: string;
  profiles: {
    full_name: string | null;
  };
  order_items: {
    id: string;
    quantity: number;
    price: number;
    products: {
      id: string;
      name: string;
    };
  }[];
}

export default function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnItems, setReturnItems] = useState<{[key: string]: {quantity: number, condition: string, restock: boolean}}>({});
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchReturns();
    fetchOrders();
  }, []);

  const fetchReturns = async () => {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        profiles!returns_customer_id_fkey(full_name, email),
        return_items(
          *,
          products(name)
        )
      `)
      .order('return_date', { ascending: false });

    if (error) {
      toast.error('Failed to fetch returns');
      console.error(error);
    } else {
      setReturns(data || []);
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at,
        profiles!orders_customer_id_fkey(full_name),
        order_items(
          id,
          quantity,
          price,
          products(id, name)
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error('Failed to fetch orders');
      console.error(error);
    } else {
      setOrders(data || []);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const itemsToReturn = Object.entries(returnItems).filter(([_, item]) => item.quantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    const totalRefund = itemsToReturn.reduce((sum, [itemId, item]) => {
      const orderItem = selectedOrder.order_items.find(oi => oi.id === itemId);
      return sum + (orderItem ? orderItem.price * item.quantity : 0);
    }, 0);

    // Create return record
    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id: selectedOrder.id,
        customer_id: selectedOrder.profiles ? (selectedOrder as any).profiles.id : null,
        processed_by: user?.id,
        reason,
        notes,
        total_refund: totalRefund,
        status: 'pending'
      })
      .select()
      .single();

    if (returnError) {
      toast.error('Failed to create return');
      console.error(returnError);
      return;
    }

    // Create return items
    const returnItemsData = itemsToReturn.map(([itemId, item]) => {
      const orderItem = selectedOrder.order_items.find(oi => oi.id === itemId);
      return {
        return_id: returnData.id,
        order_item_id: itemId,
        product_id: orderItem?.products.id,
        quantity_returned: item.quantity,
        price_per_unit: orderItem?.price || 0,
        restock: item.restock,
        condition: item.condition
      };
    });

    const { error: itemsError } = await supabase
      .from('return_items')
      .insert(returnItemsData);

    if (itemsError) {
      toast.error('Failed to create return items');
      console.error(itemsError);
      return;
    }

    toast.success('Return created successfully');
    setDialogOpen(false);
    resetForm();
    fetchReturns();
  };

  const handleUpdateReturnStatus = async (returnId: string, newStatus: string) => {
    const { error } = await supabase
      .from('returns')
      .update({ status: newStatus })
      .eq('id', returnId);

    if (error) {
      toast.error('Failed to update return status');
      console.error(error);
    } else {
      toast.success(`Return ${newStatus}`);
      fetchReturns();
    }
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setReturnItems({});
    setReason('');
    setNotes('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <BackButton />
            <h1 className="text-3xl font-bold mt-2">Returns & Refunds</h1>
            <p className="text-muted-foreground">Process product returns and manage refunds</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Create Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Return</DialogTitle>
                <DialogDescription>
                  Select an order and items to process a return
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="order">Select Order</Label>
                  <Select
                    value={selectedOrder?.id || ''}
                    onValueChange={(value) => {
                      const order = orders.find(o => o.id === value);
                      setSelectedOrder(order || null);
                      setReturnItems({});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an order" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map(order => (
                        <SelectItem key={order.id} value={order.id}>
                          Order #{order.id.slice(0, 8)} - {order.profiles?.full_name} - ${order.total.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrder && (
                  <>
                    <div>
                      <Label>Items to Return</Label>
                      <div className="border rounded-lg p-4 space-y-3 mt-2">
                        {selectedOrder.order_items.map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                            <div className="flex-1">
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Ordered: {item.quantity} @ ${item.price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Qty"
                                min={0}
                                max={item.quantity}
                                className="w-20"
                                value={returnItems[item.id]?.quantity || 0}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0;
                                  setReturnItems({
                                    ...returnItems,
                                    [item.id]: {
                                      quantity: Math.min(qty, item.quantity),
                                      condition: returnItems[item.id]?.condition || 'good',
                                      restock: returnItems[item.id]?.restock ?? true
                                    }
                                  });
                                }}
                              />
                              <Select
                                value={returnItems[item.id]?.condition || 'good'}
                                onValueChange={(value) => {
                                  setReturnItems({
                                    ...returnItems,
                                    [item.id]: {
                                      ...returnItems[item.id],
                                      quantity: returnItems[item.id]?.quantity || 0,
                                      condition: value,
                                      restock: value === 'good'
                                    }
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="good">Good</SelectItem>
                                  <SelectItem value="damaged">Damaged</SelectItem>
                                  <SelectItem value="defective">Defective</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reason">Return Reason *</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defective">Defective Product</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                          <SelectItem value="damaged">Damaged in Transit</SelectItem>
                          <SelectItem value="not_needed">No Longer Needed</SelectItem>
                          <SelectItem value="quality">Quality Issues</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional information about this return..."
                      />
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <p className="font-semibold">
                        Total Refund: ${Object.entries(returnItems).reduce((sum, [itemId, item]) => {
                          const orderItem = selectedOrder.order_items.find(oi => oi.id === itemId);
                          return sum + (orderItem ? orderItem.price * item.quantity : 0);
                        }, 0).toFixed(2)}
                      </p>
                    </div>

                    <Button onClick={handleCreateReturn} className="w-full">
                      Process Return
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Return History</CardTitle>
            <CardDescription>View and manage all product returns</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading returns...</div>
            ) : returns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No returns found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Refund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell>{format(new Date(ret.return_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{ret.profiles?.full_name || ret.profiles?.email}</TableCell>
                      <TableCell className="font-mono text-sm">#{ret.order_id.slice(0, 8)}</TableCell>
                      <TableCell className="capitalize">{ret.reason.replace('_', ' ')}</TableCell>
                      <TableCell>{ret.return_items.length} items</TableCell>
                      <TableCell className="font-semibold">${ret.total_refund.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ret.status)}>
                          {ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ret.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateReturnStatus(ret.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateReturnStatus(ret.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
