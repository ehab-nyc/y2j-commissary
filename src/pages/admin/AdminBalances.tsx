import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

interface EditingBalance {
  id: string;
  franchise_fee: number;
  commissary_rent: number;
}

interface PaymentEditing {
  id: string;
  amount_paid: number;
}

export default function AdminBalances() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<WeeklyBalance[]>([]);
  const [editing, setEditing] = useState<EditingBalance | null>(null);
  const [paymentEditing, setPaymentEditing] = useState<PaymentEditing | null>(null);
  const [saving, setSaving] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weekly_balances')
        .select('*, profiles!weekly_balances_customer_id_fkey(full_name, cart_name, cart_number)')
        .order('week_start_date', { ascending: false });

      if (error) throw error;

      setBalances(data?.map(b => ({
        ...b,
        customer: b.profiles as { full_name: string; cart_name: string; cart_number: string }
      })) || []);
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

  const handleEdit = (balance: WeeklyBalance) => {
    setEditing({
      id: balance.id,
      franchise_fee: balance.franchise_fee,
      commissary_rent: balance.commissary_rent,
    });
  };

  const handleSave = async () => {
    if (!editing) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('weekly_balances')
        .update({
          franchise_fee: editing.franchise_fee,
          commissary_rent: editing.commissary_rent,
        })
        .eq('id', editing.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Balance updated successfully',
      });

      setEditing(null);
      fetchBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
  };

  const handlePaymentEdit = (balance: WeeklyBalance) => {
    setPaymentEditing({
      id: balance.id,
      amount_paid: balance.amount_paid,
    });
  };

  const handlePaymentSave = async () => {
    if (!paymentEditing) return;

    try {
      setProcessingPayment(true);
      const { error } = await supabase
        .from('weekly_balances')
        .update({
          amount_paid: paymentEditing.amount_paid,
        })
        .eq('id', paymentEditing.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      setPaymentEditing(null);
      fetchBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentCancel = () => {
    setPaymentEditing(null);
  };

  const handleRollover = async (balance: WeeklyBalance) => {
    try {
      const { error } = await supabase.rpc('rollover_unpaid_balance', {
        p_customer_id: balance.customer_id,
        p_current_week_start: balance.week_start_date,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Balance rolled over to next week',
      });

      fetchBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Group by owner
  const groupedByOwner = balances.reduce((acc, balance) => {
    const key = balance.customer.cart_name || balance.customer.full_name;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(balance);
    return acc;
  }, {} as Record<string, WeeklyBalance[]>);

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
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Weekly Balances</h1>
            <p className="text-muted-foreground">Manage customer weekly balances and fees</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Weekly Balances</CardTitle>
            <CardDescription>View and edit franchise fees and commissary rent</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cart #</TableHead>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Old Balance</TableHead>
                  <TableHead className="text-right">Orders Total</TableHead>
                  <TableHead className="text-right">Franchise Fee</TableHead>
                  <TableHead className="text-right">Commissary Rent</TableHead>
                  <TableHead className="text-right">Total Balance</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((balance) => {
                  const isEditing = editing?.id === balance.id;
                  const isPaymentEditing = paymentEditing?.id === balance.id;
                  const statusColor = 
                    balance.payment_status === 'paid_full' ? 'text-green-600' :
                    balance.payment_status === 'partial' ? 'text-yellow-600' :
                    'text-red-600';
                  
                  return (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {balance.customer.cart_name || balance.customer.full_name}
                      </TableCell>
                      <TableCell>{balance.customer.cart_number || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(balance.week_start_date), 'MMM d')} - {format(new Date(balance.week_end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">${balance.old_balance.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${balance.orders_total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editing.franchise_fee}
                            onChange={(e) => setEditing({ ...editing, franchise_fee: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                        ) : (
                          `$${balance.franchise_fee.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editing.commissary_rent}
                            onChange={(e) => setEditing({ ...editing, commissary_rent: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                        ) : (
                          `$${balance.commissary_rent.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">${balance.total_balance.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {isPaymentEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={paymentEditing.amount_paid}
                            onChange={(e) => setPaymentEditing({ ...paymentEditing, amount_paid: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                          />
                        ) : (
                          `$${balance.amount_paid.toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${balance.remaining_balance.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${statusColor}`}>
                        {balance.payment_status === 'paid_full' ? 'Paid Full' : 
                         balance.payment_status === 'partial' ? 'Partial' : 
                         'Unpaid'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel}>
                                Cancel
                              </Button>
                            </>
                          ) : isPaymentEditing ? (
                            <>
                              <Button size="sm" onClick={handlePaymentSave} disabled={processingPayment}>
                                {processingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Payment'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handlePaymentCancel}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(balance)}>
                                Edit Fees
                              </Button>
                              <Button size="sm" variant="default" onClick={() => handlePaymentEdit(balance)}>
                                Add Payment
                              </Button>
                              {balance.remaining_balance > 0 && (
                                <Button size="sm" variant="secondary" onClick={() => handleRollover(balance)}>
                                  Rollover
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary by Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Summary by Customer</CardTitle>
            <CardDescription>Aggregated totals per customer</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Total Rent</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedByOwner).map(([customer, balances]) => {
                  const totals = balances.reduce(
                    (acc, b) => ({
                      orders: acc.orders + b.orders_total,
                      fees: acc.fees + b.franchise_fee,
                      rent: acc.rent + b.commissary_rent,
                      total: acc.total + b.total_balance,
                    }),
                    { orders: 0, fees: 0, rent: 0, total: 0 }
                  );

                  return (
                    <TableRow key={customer}>
                      <TableCell className="font-medium">{customer}</TableCell>
                      <TableCell className="text-right">${totals.orders.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals.fees.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals.rent.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${totals.total.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
