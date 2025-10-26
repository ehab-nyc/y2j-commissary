import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2, Printer, Archive, Calendar } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

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

interface SummarySnapshot {
  id: string;
  snapshot_date: string;
  week_start_date: string;
  week_end_date: string;
  summary_data: any;
  notes: string | null;
  created_at: string;
}

interface BalanceHistory {
  id: string;
  customer_id: string;
  week_start_date: string;
  week_end_date: string;
  orders_total: number;
  franchise_fee: number;
  commissary_rent: number;
  old_balance: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid_full';
  created_at: string;
  customer: {
    full_name: string;
    cart_name: string;
    cart_number: string;
  };
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
  const [snapshots, setSnapshots] = useState<SummarySnapshot[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteSnapshotDialogOpen, setDeleteSnapshotDialogOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<SummarySnapshot | null>(null);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchBalances();
    fetchOwners();
    fetchSnapshots();
    fetchBalanceHistory();
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
      // Create snapshot before rollover
      const ownerInfo = owners[balance.customer_id];
      const snapshotData = {
        customer_id: balance.customer_id,
        owner_name: ownerInfo?.owner_name || '-',
        customer_name: balance.customer.full_name,
        cart_number: balance.customer.cart_number,
        week_start: balance.week_start_date,
        week_end: balance.week_end_date,
        total_orders: balance.orders_total,
        total_fees: balance.franchise_fee,
        total_rent: balance.commissary_rent,
        total_paid: balance.amount_paid,
        remaining_balance: balance.remaining_balance
      };

      // Save snapshot
      const { error: snapshotError } = await supabase
        .from('weekly_summary_snapshots')
        .insert({
          week_start_date: balance.week_start_date,
          week_end_date: balance.week_end_date,
          summary_data: [snapshotData],
        });

      if (snapshotError) throw snapshotError;

      // Rollover balance
      const { error } = await supabase.rpc('rollover_unpaid_balance', {
        p_customer_id: balance.customer_id,
        p_current_week_start: balance.week_start_date,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Balance rolled over to next week, moved to history, and snapshot saved',
      });

      fetchBalances();
      fetchSnapshots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRolloverAll = async () => {
    const balancesWithRemaining = balances.filter(b => (b.remaining_balance ?? 0) > 0);
    
    if (balancesWithRemaining.length === 0) {
      toast({
        title: 'No Balances',
        description: 'No balances with remaining amounts to rollover',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      let successCount = 0;
      let errorCount = 0;

      for (const balance of balancesWithRemaining) {
        try {
          // Create snapshot before rollover
          const ownerInfo = owners[balance.customer_id];
          const snapshotData = {
            customer_id: balance.customer_id,
            owner_name: ownerInfo?.owner_name || '-',
            customer_name: balance.customer.full_name,
            cart_number: balance.customer.cart_number,
            week_start: balance.week_start_date,
            week_end: balance.week_end_date,
            total_orders: balance.orders_total,
            total_fees: balance.franchise_fee,
            total_rent: balance.commissary_rent,
            total_paid: balance.amount_paid,
            remaining_balance: balance.remaining_balance
          };

          // Save snapshot
          await supabase
            .from('weekly_summary_snapshots')
            .insert({
              week_start_date: balance.week_start_date,
              week_end_date: balance.week_end_date,
              summary_data: [snapshotData],
            });

          // Rollover balance
          await supabase.rpc('rollover_unpaid_balance', {
            p_customer_id: balance.customer_id,
            p_current_week_start: balance.week_start_date,
          });

          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error rolling over balance:', error);
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `${successCount} balance(s) rolled over successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: 'Error',
          description: 'Failed to rollover balances',
          variant: 'destructive',
        });
      }

      fetchBalances();
      fetchSnapshots();
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

  const fetchSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_summary_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchBalanceHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('weekly_balance_history')
        .select('*, profiles(full_name, cart_name, cart_number)')
        .order('rolled_over_at', { ascending: false });

      if (error) throw error;

      setBalanceHistory(data?.map(b => ({
        ...b,
        payment_status: b.payment_status as 'unpaid' | 'partial' | 'paid_full',
        remaining_balance: b.remaining_balance ?? 0,
        amount_paid: b.amount_paid ?? 0,
        old_balance: b.old_balance ?? 0,
        created_at: b.rolled_over_at || b.created_at,
        customer: b.profiles as { full_name: string; cart_name: string; cart_number: string }
      })) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setSavingSnapshot(true);

      // Get current week's data
      const sortedBalances = [...balances].sort((a, b) => 
        new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
      );
      
      if (sortedBalances.length === 0) {
        toast({
          title: 'No Data',
          description: 'No balance data to save',
          variant: 'destructive',
        });
        return;
      }

      const currentWeek = sortedBalances[0];
      
      // Prepare summary data
      const summaryData = Object.entries(groupedByOwner).map(([customerId, customerData]) => {
        const sortedCustomerBalances = [...customerData.balances].sort((a, b) => 
          new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime()
        );
        
        const currentWeekBalance = sortedCustomerBalances[0];
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

        return {
          customer_id: customerId,
          owner_name: ownerInfo?.owner_name || '-',
          customer_name: customerData.name,
          cart_number: customerData.cartNumber,
          week_start: currentWeekBalance.week_start_date,
          week_end: currentWeekBalance.week_end_date,
          total_orders: totals.orders,
          total_fees: totals.fees,
          total_rent: totals.rent,
          total_paid: totals.paid,
          remaining_balance: currentWeekBalance?.remaining_balance ?? 0
        };
      });

      const { error } = await supabase
        .from('weekly_summary_snapshots')
        .insert({
          week_start_date: currentWeek.week_start_date,
          week_end_date: currentWeek.week_end_date,
          summary_data: summaryData,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Weekly summary snapshot saved successfully',
      });

      fetchSnapshots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('summary-card-print');
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Weekly Summary Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; margin: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; font-weight: bold; }
      .text-right { text-align: right; }
      .font-medium { font-weight: 500; }
      .font-bold { font-weight: bold; }
      .text-green-600 { color: #16a34a; }
      h2 { margin-top: 0; }
      .report-header { margin-bottom: 20px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="report-header"><h2>Weekly Summary Report</h2><p>Current week remaining balance and aggregated totals per customer</p></div>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDeleteSnapshotClick = (snapshot: SummarySnapshot) => {
    setSnapshotToDelete(snapshot);
    setDeleteSnapshotDialogOpen(true);
  };

  const handleDeleteSnapshotConfirm = async () => {
    if (!snapshotToDelete) return;

    try {
      const { error } = await supabase
        .from('weekly_summary_snapshots')
        .delete()
        .eq('id', snapshotToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Snapshot deleted successfully',
      });

      fetchSnapshots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteSnapshotDialogOpen(false);
      setSnapshotToDelete(null);
    }
  };

  const handlePrintSnapshot = (snapshot: SummarySnapshot) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Weekly Summary Snapshot</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; margin: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; font-weight: bold; }
      .text-right { text-align: right; }
      .font-medium { font-weight: 500; }
      .font-bold { font-weight: bold; }
      .text-green-600 { color: #16a34a; }
      h2 { margin-top: 0; }
      .report-header { margin-bottom: 20px; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(`<div class="report-header">
      <h2>Weekly Summary Snapshot</h2>
      <p>Week: ${format(new Date(snapshot.week_start_date), 'MMM d')} - ${format(new Date(snapshot.week_end_date), 'MMM d, yyyy')}</p>
      <p>Saved: ${format(new Date(snapshot.created_at), 'MMM d, yyyy h:mm a')}</p>
    </div>`);
    
    printWindow.document.write('<table><thead><tr>');
    printWindow.document.write('<th>Owner</th><th>Customer</th><th>Cart #</th><th>Current Week</th>');
    printWindow.document.write('<th class="text-right">Total Orders</th><th class="text-right">Total Fees</th>');
    printWindow.document.write('<th class="text-right">Total Rent</th><th class="text-right">Total Paid</th>');
    printWindow.document.write('<th class="text-right">Remaining Balance</th></tr></thead><tbody>');
    
    snapshot.summary_data.forEach((row: any) => {
      printWindow.document.write(`<tr>
        <td class="font-medium">${row.owner_name}</td>
        <td class="font-medium">${row.customer_name}</td>
        <td>${row.cart_number || '-'}</td>
        <td>${format(new Date(row.week_start), 'MMM d')} - ${format(new Date(row.week_end), 'MMM d, yyyy')}</td>
        <td class="text-right">$${row.total_orders.toFixed(2)}</td>
        <td class="text-right">$${row.total_fees.toFixed(2)}</td>
        <td class="text-right">$${row.total_rent.toFixed(2)}</td>
        <td class="text-right text-green-600">$${row.total_paid.toFixed(2)}</td>
        <td class="text-right font-bold">$${row.remaining_balance.toFixed(2)}</td>
      </tr>`);
    });
    
    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Weekly Balances</h1>
            <p className="text-muted-foreground">Manage customer weekly balances, payments and rollovers</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Weekly Balances</CardTitle>
                <CardDescription>Track customer payments and manage unpaid balances</CardDescription>
              </div>
              <Button 
                onClick={handleRolloverAll} 
                variant="secondary" 
                disabled={saving || balances.filter(b => (b.remaining_balance ?? 0) > 0).length === 0}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4 mr-2" />
                )}
                Rollover All
              </Button>
            </div>
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

        {/* Summary Section with Tabs */}
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Summary</TabsTrigger>
            <TabsTrigger value="history">Rollover History</TabsTrigger>
            <TabsTrigger value="snapshots">Manual Snapshots</TabsTrigger>
          </TabsList>

          {/* Current Summary Tab */}
          <TabsContent value="current">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Summary by Customer</CardTitle>
                    <CardDescription>Current week remaining balance and aggregated totals per customer</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSnapshot} variant="default" size="sm" disabled={savingSnapshot}>
                      {savingSnapshot ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Archive className="h-4 w-4 mr-2" />
                      )}
                      Save Snapshot
                    </Button>
                    <Button onClick={handlePrint} variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-2" />
                      Print Summary
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent id="summary-card-print">
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
      </TabsContent>

      {/* Rollover History Tab */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Balance History</CardTitle>
            <CardDescription>All rolled-over balances that were moved to history</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : balanceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No balance history found. Balances will appear here after rollover.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cart #</TableHead>
                      <TableHead>Week Period</TableHead>
                      <TableHead className="text-right">Old Balance</TableHead>
                      <TableHead className="text-right">Orders Total</TableHead>
                      <TableHead className="text-right">Franchise Fee</TableHead>
                      <TableHead className="text-right">Commissary Rent</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead>Moved to History</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceHistory.map((record) => {
                      const statusColor = 
                        record.payment_status === 'paid_full' ? 'text-green-600' :
                        record.payment_status === 'partial' ? 'text-yellow-600' :
                        'text-red-600';
                      
                      const totalBalance = record.orders_total + record.franchise_fee + record.commissary_rent;
                      const totalDue = totalBalance + record.old_balance;
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.customer.cart_name || record.customer.full_name}
                          </TableCell>
                          <TableCell>{record.customer.cart_number || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(record.week_start_date), 'MMM d')} - {format(new Date(record.week_end_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">${record.old_balance.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${record.orders_total.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${record.franchise_fee.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${record.commissary_rent.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold">${totalDue.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-green-600">${record.amount_paid.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold">${record.remaining_balance.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-semibold ${statusColor}`}>
                            {record.payment_status === 'paid_full' ? 'Paid Full' : 
                             record.payment_status === 'partial' ? 'Partial' : 
                             'Unpaid'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(record.created_at), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Manual Snapshots Tab */}
      <TabsContent value="snapshots">
        <Card>
          <CardHeader>
            <CardTitle>Historical Snapshots</CardTitle>
            <CardDescription>View and print past weekly summary snapshots</CardDescription>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Label htmlFor="start-date">From Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">To Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {snapshots
                .filter((snapshot) => {
                  if (!startDate && !endDate) return true;
                  const snapshotDate = new Date(snapshot.week_start_date);
                  const start = startDate ? new Date(startDate) : null;
                  const end = endDate ? new Date(endDate) : null;
                  
                  if (start && snapshotDate < start) return false;
                  if (end && snapshotDate > end) return false;
                  return true;
                })
                .map((snapshot) => (
                  <Card key={snapshot.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Week: {format(new Date(snapshot.week_start_date), 'MMM d')} - {format(new Date(snapshot.week_end_date), 'MMM d, yyyy')}
                          </CardTitle>
                          <CardDescription>
                            Saved on {format(new Date(snapshot.created_at), 'MMM d, yyyy h:mm a')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handlePrintSnapshot(snapshot)} variant="outline" size="sm">
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          <Button onClick={() => handleDeleteSnapshotClick(snapshot)} variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Owner</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Cart #</TableHead>
                            <TableHead>Week</TableHead>
                            <TableHead className="text-right">Total Orders</TableHead>
                            <TableHead className="text-right">Total Fees</TableHead>
                            <TableHead className="text-right">Total Rent</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead className="text-right">Remaining Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.summary_data.map((row: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.owner_name}</TableCell>
                              <TableCell className="font-medium">{row.customer_name}</TableCell>
                              <TableCell>{row.cart_number || '-'}</TableCell>
                              <TableCell>
                                {format(new Date(row.week_start), 'MMM d')} - {format(new Date(row.week_end), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">${row.total_orders.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${row.total_fees.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${row.total_rent.toFixed(2)}</TableCell>
                              <TableCell className="text-right text-green-600">${row.total_paid.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold">${row.remaining_balance.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              {snapshots.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No snapshots saved yet. Save a snapshot from the Current Summary tab.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
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

      <AlertDialog open={deleteSnapshotDialogOpen} onOpenChange={setDeleteSnapshotDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              {snapshotToDelete && (
                <>
                  Are you sure you want to delete this snapshot for week{' '}
                  {format(new Date(snapshotToDelete.week_start_date), 'MMM d')} -{' '}
                  {format(new Date(snapshotToDelete.week_end_date), 'MMM d, yyyy')}?
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSnapshotConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
