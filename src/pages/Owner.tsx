import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShoppingCart, TrendingUp, Users, ArrowUpDown, Eye, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type OrderSortField = 'created_at' | 'status' | 'total' | 'customer';
type SortDirection = 'asc' | 'desc';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  cart_name: string;
  cart_number: string;
  total_spent: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  box_size: string;
  products: {
    name: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  customer: {
    full_name: string;
    cart_name: string;
    cart_number: string;
  };
}

interface WeeklyBalance {
  id: string;
  customer_id: string;
  week_start_date: string;
  week_end_date: string;
  orders_total: number;
  franchise_fee: number;
  commissary_rent: number;
  total_balance: number;
  old_balance: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid_full';
  customer: {
    full_name: string;
    cart_name: string;
    cart_number: string;
  };
}

export default function Owner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balances, setBalances] = useState<WeeklyBalance[]>([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalPaid: 0,
    remainingBalance: 0,
    activeOrders: 0,
  });
  const [sortField, setSortField] = useState<OrderSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [serviceFee, setServiceFee] = useState<number>(10);

  useEffect(() => {
    fetchData();
    fetchServiceFee();
  }, [user]);

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

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch assigned customers
      const { data: ownerships, error: ownershipError } = await supabase
        .from('cart_ownership')
        .select('customer_id, profiles!cart_ownership_customer_id_fkey(id, full_name, email, cart_name, cart_number, total_spent)')
        .eq('owner_id', user.id);

      if (ownershipError) throw ownershipError;

      const customersList = ownerships?.map(o => o.profiles).filter(Boolean) as Customer[];
      setCustomers(customersList);

      const customerIds = customersList.map(c => c.id);

      // Fetch orders for these customers
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, status, total, profiles!orders_customer_id_fkey(full_name, cart_name, cart_number)')
        .in('customer_id', customerIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      setOrders(ordersData?.map(o => ({
        ...o,
        customer: o.profiles as { full_name: string; cart_name: string; cart_number: string }
      })) || []);

      // Fetch weekly balances
      const { data: balancesData, error: balancesError } = await supabase
        .from('weekly_balances')
        .select('*, profiles!weekly_balances_customer_id_fkey(full_name, cart_name, cart_number)')
        .in('customer_id', customerIds)
        .order('week_start_date', { ascending: false });

      if (balancesError) throw balancesError;

      setBalances(balancesData?.map(b => ({
        ...b,
        payment_status: b.payment_status as 'unpaid' | 'partial' | 'paid_full',
        customer: b.profiles as { full_name: string; cart_name: string; cart_number: string }
      })) || []);

      // Calculate stats
      const totalOrders = ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const activeOrders = ordersData?.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length || 0;
      const totalPaid = balancesData?.reduce((sum, b) => sum + (b.amount_paid || 0), 0) || 0;
      const remainingBalance = balancesData?.reduce((sum, b) => sum + (b.remaining_balance || 0), 0) || 0;

      setStats({
        totalCustomers: customersList.length,
        totalOrders,
        totalPaid,
        remainingBalance,
        activeOrders,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleSort = (field: OrderSortField) => {
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
      const nameA = a.customer.cart_name || a.customer.full_name || '';
      const nameB = b.customer.cart_name || b.customer.full_name || '';
      comparison = nameA.localeCompare(nameB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, quantity, price, box_size, products!order_items_product_id_fkey(name)')
        .eq('order_id', order.id);

      if (error) throw error;
      setOrderItems(data?.map(item => ({
        ...item,
        products: item.products as { name: string }
      })) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor your carts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Carts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cart Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalOrders.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalPaid.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.remainingBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOrders}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">My Carts</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="balances">Weekly Balances</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Carts</CardTitle>
                <CardDescription>Customers under your management</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Cart Name</TableHead>
                      <TableHead>Cart Number</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.full_name}</TableCell>
                        <TableCell>{customer.cart_name || '-'}</TableCell>
                        <TableCell>{customer.cart_number || '-'}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell className="text-right">${customer.total_spent?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Orders from your carts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
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
                    onClick={() => handleSort('created_at')}
                    className="gap-1"
                  >
                    Date <ArrowUpDown className="w-3 h-3" />
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
                      <TableHead>Cart Name</TableHead>
                      <TableHead>Cart #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          {order.customer.cart_name || order.customer.full_name}
                        </TableCell>
                        <TableCell>{order.customer.cart_number || '-'}</TableCell>
                        <TableCell>{format(new Date(order.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Balances</CardTitle>
                <CardDescription>Financial overview by week</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cart Name</TableHead>
                      <TableHead>Cart #</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead className="text-right">Old Balance</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Fees & Rent</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((balance) => {
                      const statusColor = 
                        balance.payment_status === 'paid_full' ? 'text-green-600' :
                        balance.payment_status === 'partial' ? 'text-yellow-600' :
                        'text-red-600';
                      
                      return (
                        <TableRow key={balance.id}>
                          <TableCell>{balance.customer.cart_name || balance.customer.full_name}</TableCell>
                          <TableCell>{balance.customer.cart_number || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(balance.week_start_date), 'MMM d')} - {format(new Date(balance.week_end_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">${(balance.old_balance ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(balance.orders_total ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ${((balance.franchise_fee ?? 0) + (balance.commissary_rent ?? 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${((balance.total_balance ?? 0) + (balance.old_balance ?? 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            ${(balance.amount_paid ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${(balance.remaining_balance ?? 0).toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${statusColor}`}>
                            {balance.payment_status === 'paid_full' ? 'Paid Full' : 
                             balance.payment_status === 'partial' ? 'Partial' : 
                             'Unpaid'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id.substring(0, 8)} - {selectedOrder?.customer.cart_name || selectedOrder?.customer.full_name}
              {selectedOrder?.customer.cart_number && ` (${selectedOrder.customer.cart_number})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{selectedOrder && format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={selectedOrder ? getStatusColor(selectedOrder.status) : 'outline'}>
                  {selectedOrder?.status}
                </Badge>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Box Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.products.name}</TableCell>
                      <TableCell>{item.box_size}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${selectedOrder ? (selectedOrder.total - serviceFee).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee:</span>
                <span>${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>${selectedOrder?.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
