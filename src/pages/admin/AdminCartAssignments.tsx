import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  cart_name: string;
  cart_number: string;
}

interface CartOwnership {
  id: string;
  owner_id: string;
  customer_id: string;
  assigned_at: string;
  owner: Profile;
  customer: Profile;
}

export default function AdminCartAssignments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<CartOwnership[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch owners
      const { data: ownersData, error: ownersError } = await supabase
        .from('user_roles')
        .select('user_id, profiles!user_roles_user_id_fkey(id, full_name, email, cart_name, cart_number)')
        .eq('role', 'owner');

      if (ownersError) throw ownersError;

      const ownersList = ownersData?.map(o => o.profiles).filter(Boolean) as Profile[];
      setOwners(ownersList);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('user_roles')
        .select('user_id, profiles!user_roles_user_id_fkey(id, full_name, email, cart_name, cart_number)')
        .eq('role', 'customer');

      if (customersError) throw customersError;

      const customersList = customersData?.map(c => c.profiles).filter(Boolean) as Profile[];
      setCustomers(customersList);

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('cart_ownership')
        .select(`
          id,
          owner_id,
          customer_id,
          assigned_at,
          owner:profiles!cart_ownership_owner_id_fkey(id, full_name, email, cart_name, cart_number),
          customer:profiles!cart_ownership_customer_id_fkey(id, full_name, email, cart_name, cart_number)
        `);

      if (assignmentsError) throw assignmentsError;

      setAssignments(assignmentsData as any);
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

  const handleAssign = async () => {
    if (!selectedOwner || !selectedCustomer) {
      toast({
        title: 'Error',
        description: 'Please select both an owner and a customer',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssigning(true);

      const { error } = await supabase
        .from('cart_ownership')
        .insert({
          owner_id: selectedOwner,
          customer_id: selectedCustomer,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Cart assigned successfully',
      });

      setSelectedOwner('');
      setSelectedCustomer('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('cart_ownership')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Cart unassigned successfully',
      });

      fetchData();
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
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Cart Assignments</h1>
            <p className="text-muted-foreground">Assign customers to owners</p>
          </div>
        </div>

        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Assign Cart to Owner</CardTitle>
            <CardDescription>Link a customer cart to an owner account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Owner</label>
                <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name} ({owner.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Customer</label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.cart_name || customer.full_name} - {customer.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAssign} disabled={assigning}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
            <CardDescription>Active cart-owner relationships</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Owner Email</TableHead>
                  <TableHead>Customer Cart</TableHead>
                  <TableHead>Customer Email</TableHead>
                  <TableHead>Cart Number</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.owner.full_name}</TableCell>
                    <TableCell>{assignment.owner.email}</TableCell>
                    <TableCell>{assignment.customer.cart_name || assignment.customer.full_name}</TableCell>
                    <TableCell>{assignment.customer.email}</TableCell>
                    <TableCell>{assignment.customer.cart_number || '-'}</TableCell>
                    <TableCell>{new Date(assignment.assigned_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unassign Cart?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the assignment between {assignment.owner.full_name} and {assignment.customer.cart_name || assignment.customer.full_name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnassign(assignment.id)}>
                              Unassign
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
