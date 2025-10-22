import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { User, Lock, Save, ShoppingBag, Eye, EyeOff, Phone, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { z } from 'zod';
import { passwordSchema } from '@/lib/validation';
import { validateAndNormalizePhone } from '@/lib/phoneValidation';
import { useTranslation } from 'react-i18next';

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
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
  profiles?: {
    full_name: string;
    cart_number: string;
  };
}


const Profile = () => {
  const { user, hasRole } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fullName, setFullName] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchOrders();
    fetchPhoneNumbers();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setEmailNotifications(data.email_notifications ?? true);
    }
  };

  const fetchPhoneNumbers = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });
    
    if (data) {
      setPhoneNumbers(data);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          quantity,
          price,
          box_size,
          products(name)
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data || []);
    }
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


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation schemas
    const fullNameSchema = z.string().max(100, 'Full name cannot exceed 100 characters').trim();

    // Validate full name
    const nameValidation = fullNameSchema.safeParse(fullName);
    if (!nameValidation.success) {
      toast.error(nameValidation.error.errors[0].message);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: nameValidation.data,
        email_notifications: emailNotifications,
      })
      .eq('id', user?.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
      fetchProfile();
    }

    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  const handleAddPhone = async () => {
    if (!newPhone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Validate and normalize phone to E.164 format
    const result = validateAndNormalizePhone(newPhone);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const normalizedPhone = result.phone!;

    const { error } = await supabase
      .from('user_phone_numbers')
      .insert({
        user_id: user?.id,
        phone_number: normalizedPhone,
        is_primary: phoneNumbers.length === 0
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This phone number is already added');
      } else {
        toast.error('Failed to add phone number');
      }
    } else {
      toast.success('Phone number added successfully');
      setNewPhone('');
      fetchPhoneNumbers();
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    const { error } = await supabase
      .from('user_phone_numbers')
      .delete()
      .eq('id', phoneId);

    if (error) {
      toast.error('Failed to delete phone number');
    } else {
      toast.success('Phone number deleted successfully');
      fetchPhoneNumbers();
    }
  };

  const handleTestSMS = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: 'Test SMS from Y2J Commissary! If you received this, SMS notifications are working correctly.'
        }
      });

      if (error) throw error;

      toast.success(`Test SMS sent to ${phoneNumber}!`);
    } catch (error: any) {
      console.error('SMS test error:', error);
      toast.error(`Failed to send test SMS: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground">{t('profile.subtitle')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('profile.profileInfo')}
              </CardTitle>
              <CardDescription>{t('profile.updateDetails')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">{t('profile.emailCannotChange')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive order updates via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={loading} className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? t('profile.saving') : t('profile.saveChanges')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {t('profile.changePassword')}
              </CardTitle>
              <CardDescription>{t('profile.updatePasswordSecurity')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('profile.confirmNewPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full gap-2">
                  <Lock className="w-4 h-4" />
                  {loading ? t('profile.updating') : t('profile.updatePassword')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {hasRole('customer') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Phone Numbers for SMS Notifications
              </CardTitle>
              <CardDescription>
                SMS notifications are always enabled. Add multiple phone numbers to receive order updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <Button onClick={handleAddPhone} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {phoneNumbers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No phone numbers added yet
                  </p>
                ) : (
                  phoneNumbers.map((phoneNum) => (
                    <div
                      key={phoneNum.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{phoneNum.phone_number}</span>
                        {phoneNum.is_primary && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestSMS(phoneNum.phone_number)}
                        >
                          Test SMS
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePhone(phoneNum.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {hasRole('customer') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t('profile.orderHistory')}
              </CardTitle>
              <CardDescription>{t('profile.viewPastOrders')}</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('profile.noOrdersYet')}</p>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'PPp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-primary">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Box Size</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Profile;
