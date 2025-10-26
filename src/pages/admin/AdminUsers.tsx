import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { KeyRound, Trash2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const roleSchema = z.enum(['customer', 'worker', 'manager', 'admin', 'super_admin', 'owner']);

const profileEditSchema = z.object({
  full_name: z.string().trim().max(100, 'Name must be less than 100 characters').optional(),
  cart_name: z.string().trim().max(100, 'Cart name must be less than 100 characters').optional(),
  cart_number: z.string().trim().max(50, 'Cart number must be less than 50 characters').optional(),
  phone: z.string().trim().max(20, 'Phone must be less than 20 characters').optional(),
});

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    cart_name: '',
    cart_number: '',
    phone: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Use server-side function that filters out super_admins
    const { data, error } = await supabase.rpc('get_manageable_profiles');
    
    if (error) {
      toast.error('Failed to fetch users');
      console.error('Error fetching users:', error);
      return;
    }
    
    // Transform the data to match the expected format
    const transformedUsers = (data || []).map((user: any) => ({
      ...user,
      user_roles: user.user_roles || []
    }));
    
    setUsers(transformedUsers);
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    const validation = roleSchema.safeParse(newRole);
    if (!validation.success) {
      toast.error('Invalid role selected');
      return;
    }

    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: validation.data as any }]);

    if (error) {
      toast.error('Failed to update user role');
    } else {
      toast.success('User role updated successfully');
      fetchUsers();
    }
  };

  const handleResetUserPassword = async (userId: string, userEmail: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast.error('Failed to send password reset email');
    } else {
      toast.success(`Password reset email sent to ${userEmail}`);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        toast.error(error.message || 'Failed to delete user');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`User ${userEmail} deleted successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to delete user');
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      cart_name: user.cart_name || '',
      cart_number: user.cart_number || '',
      phone: user.phone || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;

    // Validate the form
    const validation = profileEditSchema.safeParse(editForm);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Update the profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name || null,
        cart_name: editForm.cart_name || null,
        cart_number: editForm.cart_number || null,
        phone: editForm.phone || null,
      })
      .eq('id', editingUser.id);

    if (error) {
      toast.error('Failed to update user profile');
      console.error('Error updating profile:', error);
    } else {
      toast.success('User profile updated successfully');
      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and roles</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cart Info</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const currentRole = user.user_roles?.[0]?.role || 'customer';
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.cart_name && (
                      <div className="text-sm">
                        {user.cart_name} {user.cart_number ? `#${user.cart_number}` : ''}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Select
                      value={currentRole}
                      onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        title="Edit Profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleResetUserPassword(user.id, user.email)}
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" title="Delete User">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete user {user.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.email)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>
                Update user profile information. Email cannot be changed.
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email (Read-only)</Label>
                  <Input
                    id="edit-email"
                    value={editingUser.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input
                    id="edit-full-name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="Enter full name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cart-name">Cart Name</Label>
                  <Input
                    id="edit-cart-name"
                    value={editForm.cart_name}
                    onChange={(e) => setEditForm({ ...editForm, cart_name: e.target.value })}
                    placeholder="Enter cart name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cart-number">Cart Number</Label>
                  <Input
                    id="edit-cart-number"
                    value={editForm.cart_number}
                    onChange={(e) => setEditForm({ ...editForm, cart_number: e.target.value })}
                    placeholder="Enter cart number"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
