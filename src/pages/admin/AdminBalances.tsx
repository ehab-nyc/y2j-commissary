import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface OwnerInfo {
  owner_id: string;
  owner_name: string;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [balanceToDelete, setBalanceToDelete] = useState<WeeklyBalance | null>(null);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});

  useEffect(() => {
    fetchBalances();
    fetchOwners();
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
        payment_status: b.payment_status as 'unpaid' | 'partial' | 'paid_full',
        remaining_balance: b.remaining_balance ?? 0,
        amount_paid: b.amount_paid ?? 0,
        old_balance: b.old_balance ?? 0,
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

  const fetchOwners = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_ownership')
        .select('customer_id, owner_id, profiles!cart_ownership_owner_id_fkey(full_name)');

      if (error) throw error;

      const ownerMap: Record<string, OwnerInfo> = {};
      data?.forEach(item => {
        ownerMap[item.customer_id] = {
          owner_id: item.owner_id,
          owner_name: (item.profiles as any)?.full_name || 'Unknown'
        };
      });
      setOwners(ownerMap);
    } catch (error: any) {
      console.error('Error fetching owners:', error);
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
      
      // Find the balance record to calculate remaining after fee changes
      const balance = balances.find(b => b.id === editing.id);
      if (!balance) throw new Error('Balance not found');
      
      const newTotalBalance = (balance.orders_total ?? 0) + editing.franchise_fee + editing.commissary_rent;
      const totalDue = newTotalBalance + (balance.old_balance ?? 0);
      const remainingBalance = totalDue - (balance.amount_paid ?? 0);
      
      let paymentStatus: 'unpaid' | 'partial' | 'paid_full' = 'unpaid';
      if (remainingBalance <= 0 && totalDue > 0) {
        paymentStatus = 'paid_full';
      } else if ((balance.amount_paid ?? 0) > 0) {
        paymentStatus = 'partial';
      }
      
      const { error } = await supabase
        .from('weekly_balances')
        .update({
          franchise_fee: editing.franchise_fee,
          commissary_rent: editing.commissary_rent,
          remaining_balance: Math.max(0, remainingBalance),
          payment_status: paymentStatus,
        })
        .eq('id', editing.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Fees updated successfully',
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
      
      // Find the balance record to calculate remaining
      const balance = balances.find(b => b.id === paymentEditing.id);
      if (!balance) throw new Error('Balance not found');
      
      const totalDue = (balance.total_balance ?? 0) + (balance.old_balance ?? 0);
      const remainingBalance = totalDue - paymentEditing.amount_paid;
      
      let paymentStatus: 'unpaid' | 'partial' | 'paid_full' = 'unpaid';
      if (remainingBalance <= 0 && totalDue > 0) {
        paymentStatus = 'paid_full';
      } else if (paymentEditing.amount_paid > 0) {
        paymentStatus = 'partial';
      }
      
      const { error } = await supabase
        .from('weekly_balances')
        .update({
          amount_paid: paymentEditing.amount_paid,
          remaining_balance: Math.max(0, remainingBalance),
          payment_status: paymentStatus,
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
        description: 'Balance rolled over to next week and moved to history',
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

  const handleDeleteClick = (balance: WeeklyBalance) => {
    setBalanceToDelete(balance);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!balanceToDelete) return;

    try {
      const { error } = await supabase
        .from('weekly_balances')
        .delete()
        .eq('id', balanceToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Weekly balance deleted successfully',
      });

      fetchBalances();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setBalanceToDelete(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group by owner (using customer_id as unique key)
  const groupedByOwner = balances.reduce((acc, balance) => {
    const key = balance.customer_id;
    if (!acc[key]) {
      acc[key] = {
        name: balance.customer.cart_name || balance.customer.full_name,
        cartNumber: balance.customer.cart_number,
        balances: []
      };
    }
    acc[key].balances.push(balance);
    return acc;
  }, {} as Record<string, { name: string; cartNumber: string; balances: WeeklyBalance[] }>);

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
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold">Weekly Balances</h1>
              <p className="text-muted-foreground">Manage customer weekly balances, payments and rollovers</p>
            </div>
          </div>
          <Button onClick={handlePrint} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Weekly Balances</CardTitle>
            <CardDescription>Track customer payments and manage unpaid balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                        <TableCell className="text-right">${(balance.old_balance ?? 0).toFixed(2)}</TableCell>
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
                        <TableCell className="text-right font-bold">
                          ${((balance.total_balance ?? 0) + (balance.old_balance ?? 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPaymentEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={paymentEditing.amount_paid}
                              onChange={(e) => setPaymentEditing({ ...paymentEditing, amount_paid: parseFloat(e.target.value) || 0 })}
                              className="w-24"
                              placeholder="0.00"
                            />
                          ) : (
                            `$${(balance.amount_paid ?? 0).toFixed(2)}`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${(balance.remaining_balance ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${statusColor}`}>
                          {balance.payment_status === 'paid_full' ? 'Paid Full' : 
                           balance.payment_status === 'partial' ? 'Partial' : 
                           'Unpaid'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 no-print">
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
                                {(balance.remaining_balance ?? 0) > 0 && (
                                  <Button size="sm" variant="secondary" onClick={() => handleRollover(balance)}>
                                    Rollover
                                  </Button>
                                )}
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(balance)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary by Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Summary by Customer</CardTitle>
            <CardDescription>Current week remaining balance and aggregated totals per customer</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Cart #</TableHead>
                  <TableHead>Current Week</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Total Rent</TableHead>
                  <TableHead className="text-right">Total Paid</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedByOwner).map(([customerId, customerData]) => {
                  // Sort balances by week_start_date descending to get most recent first
                  const sortedBalances = [...customerData.balances].sort((a, b) => 
                    new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
                  );
                  
                  // Get the most recent week's remaining balance (to avoid double-counting old balances)
                  const currentWeekBalance = sortedBalances[0];
                  const mostRecentRemaining = currentWeekBalance?.remaining_balance ?? 0;
                  
                  const totals = customerData.balances.reduce(
                    (acc, b) => ({
                      orders: acc.orders + (b.orders_total ?? 0),
                      fees: acc.fees + (b.franchise_fee ?? 0),
                      rent: acc.rent + (b.commissary_rent ?? 0),
                      paid: acc.paid + (b.amount_paid ?? 0),
                    }),
                    { orders: 0, fees: 0, rent: 0, paid: 0 }
                  );

                  const ownerInfo = owners[customerId];

                  return (
                    <TableRow key={customerId}>
                      <TableCell className="font-medium">{ownerInfo?.owner_name || '-'}</TableCell>
                      <TableCell className="font-medium">{customerData.name}</TableCell>
                      <TableCell>{customerData.cartNumber || '-'}</TableCell>
                      <TableCell>
                        {currentWeekBalance && (
                          <>
                            {format(new Date(currentWeekBalance.week_start_date), 'MMM d')} - {format(new Date(currentWeekBalance.week_end_date), 'MMM d, yyyy')}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${totals.orders.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals.fees.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${totals.rent.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">${totals.paid.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">${mostRecentRemaining.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Weekly Balance</AlertDialogTitle>
            <AlertDialogDescription>
              {balanceToDelete && (
                <>
                  Are you sure you want to delete this weekly balance for{' '}
                  <strong>{balanceToDelete.customer.cart_name || balanceToDelete.customer.full_name}</strong>
                  {' '}({format(new Date(balanceToDelete.week_start_date), 'MMM d')} -{' '}
                  {format(new Date(balanceToDelete.week_end_date), 'MMM d, yyyy')})?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
