import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Package, Upload, X, KeyRound, ShoppingBag, ClipboardList, Eye, Folder, Printer } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { productSchema, categorySchema, settingsSchema } from '@/lib/validation';
import { z } from 'zod';

const roleSchema = z.enum(['customer', 'worker', 'manager', 'admin', 'super_admin']);

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBoxSizes, setSelectedBoxSizes] = useState<string[]>(['1 box']);
  const [settings, setSettings] = useState({ company_name: '', logo_url: '', login_background_url: '', login_blur_amount: '2', service_fee: '10' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [serviceFee, setServiceFee] = useState<number>(10);
  const [activeTheme, setActiveTheme] = useState<'default' | 'halloween' | 'christmas' | 'christmas-wonderland'>('default');
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  const BOX_SIZE_OPTIONS = ['1 box', '1/2 box', '1/4 box'];

  // Server-side role verification for defense in depth
  useEffect(() => {
    const verifyAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'super_admin']);

      if (error || !roles || roles.length === 0) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
      }
    };

    verifyAdminAccess();
  }, [navigate]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUsers();
    fetchOrders();
    fetchSettings();
    fetchCompanySettings();
    fetchServiceFee();
    fetchActiveTheme();
    fetchCurrentUserRoles();

    // Subscribe to theme changes
    const channel = supabase
      .channel('admin_theme_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.active_theme',
        },
        (payload) => {
          const newTheme = (payload.new.value || 'default') as 'default' | 'halloween' | 'christmas' | 'christmas-wonderland';
          setActiveTheme(newTheme);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentUserRoles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      setCurrentUserRoles(data?.map(r => r.role) || []);
    }
  };

  const isSuperAdmin = currentUserRoles.includes('super_admin');

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

  const fetchActiveTheme = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_theme')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching active theme in Admin:', error);
        return;
      }
      
      const theme = (data?.value || 'default') as 'default' | 'halloween' | 'christmas' | 'christmas-wonderland';
      console.log('Admin: Fetched active theme:', theme);
      setActiveTheme(theme);
    } catch (error) {
      console.error('Exception fetching active theme in Admin:', error);
    }
  };

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'logo_url', 'company_address', 'company_email']);
    
    if (data) {
      const nameEntry = data.find(s => s.key === 'company_name');
      const logoEntry = data.find(s => s.key === 'logo_url');
      const addressEntry = data.find(s => s.key === 'company_address');
      const emailEntry = data.find(s => s.key === 'company_email');
      setCompanyName(nameEntry?.value || 'Company');
      setLogoUrl(logoEntry?.value || '');
      setCompanyAddress(addressEntry?.value || '');
      setCompanyEmail(emailEntry?.value || '');
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('name');
    setProducts(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles(role)
      `)
      .order('email');
    
    // Filter out super_admin users (check all roles, not just first)
    const filteredUsers = (data || []).filter(user => {
      return !user.user_roles?.some((ur: any) => ur.role === 'super_admin');
    });
    
    setUsers(filteredUsers);
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
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'logo_url', 'login_background_url', 'login_blur_amount', 'service_fee']);
    
    if (data) {
      const settingsObj = data.reduce((acc: any, item) => {
        acc[item.key] = item.value || '';
        return acc;
      }, {});
      setSettings({
        company_name: settingsObj.company_name || 'Commissary System',
        logo_url: settingsObj.logo_url || '',
        login_background_url: settingsObj.login_background_url || '',
        login_blur_amount: settingsObj.login_blur_amount || '2',
        service_fee: settingsObj.service_fee || '10'
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading image:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('Image uploaded successfully:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Unexpected error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Parse and validate input data
    const rawData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      price: parseFloat(formData.get('price') as string),
      quantity: parseInt(formData.get('quantity') as string),
      category_id: formData.get('category_id') as string,
    };

    // Validate with schema
    const validation = productSchema.safeParse(rawData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const validatedData = validation.data;
    
    let imageUrl = editingProduct?.image_url;
    
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    }
    
    const productData = {
      name: validatedData.name,
      description: validatedData.description || '',
      price: validatedData.price,
      quantity: validatedData.quantity,
      category_id: validatedData.category_id,
      image_url: imageUrl,
      box_sizes: selectedBoxSizes.length > 0 ? selectedBoxSizes : ['1 box'],
      active: true,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);
      
      if (error) {
        toast.error('Failed to update product');
      } else {
        toast.success('Product updated successfully');
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);
      
      if (error) {
        toast.error('Failed to create product');
      } else {
        toast.success('Product created successfully');
      }
    }

    setShowProductDialog(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setSelectedBoxSizes(['1 box']);
    fetchProducts();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    // Validate role
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
      // Call edge function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        console.error('Delete user error:', error);
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
      console.error('Unexpected error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateUserProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const profileData = {
      full_name: (formData.get('full_name') as string).trim(),
      phone: (formData.get('phone') as string).trim() || null,
      cart_name: (formData.get('cart_name') as string).trim() || null,
      cart_number: (formData.get('cart_number') as string).trim() || null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', editingUser.id);

    if (error) {
      toast.error('Failed to update user profile');
    } else {
      toast.success('User profile updated successfully');
      setShowUserDialog(false);
      setEditingUser(null);
      fetchUsers();
    }
  };

  const handleUpdateTheme = async (newTheme: 'default' | 'halloween' | 'christmas' | 'christmas-wonderland') => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        key: 'active_theme', 
        value: newTheme 
      }, { 
        onConflict: 'key' 
      });

    if (error) {
      toast.error('Failed to update theme');
    } else {
      toast.success('Theme updated successfully');
      setActiveTheme(newTheme);
    }
  };

  const handleDeleteTheme = async () => {
    // Switch to default theme
    await handleUpdateTheme('default');
  };

  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const categoryData = {
      name: (formData.get('name') as string).trim(),
      description: (formData.get('description') as string)?.trim() || undefined,
    };

    // Validate category data
    const validation = categorySchema.safeParse(categoryData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (editingCategory) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update({ 
          name: validation.data.name,
          description: validation.data.description || null
        })
        .eq('id', editingCategory.id);

      if (error) {
        toast.error('Failed to update category');
        return;
      }
      toast.success('Category updated successfully');
    } else {
      // Create new category
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: validation.data.name,
          description: validation.data.description || null
        }]);

      if (error) {
        toast.error('Failed to create category');
        return;
      }
      toast.success('Category created successfully');
    }

    setShowCategoryDialog(false);
    setEditingCategory(null);
    fetchCategories();
    fetchProducts(); // Refresh products to update category names
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check if category has products
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', categoryId);

    if (products && products.length > 0) {
      toast.error('Cannot delete category with existing products');
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted successfully');
      fetchCategories();
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to delete order');
    } else {
      toast.success('Order deleted successfully');
      fetchOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted';
    }
  };

  const printOrder = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.order_items?.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.products?.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.box_size || '1 box'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${Number(item.price).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * Number(item.price)).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${order.id.slice(0, 8)}</title>
          <style>
            @media print {
              @page { 
                margin: 0;
                size: auto;
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 8.5in;
              margin: 0.5in auto;
              padding: 15px;
              position: relative;
              font-size: 9px;
            }
            body::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 50%;
              height: 50%;
              background-image: url('${logoUrl}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              opacity: 0.08;
              z-index: 0;
              pointer-events: none;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1.5px solid #000;
              position: relative;
              z-index: 1;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .logo {
              max-height: 60px;
              max-width: 120px;
            }
            .company-name {
              font-size: 13px;
              font-weight: bold;
            }
            .order-info {
              text-align: right;
              font-size: 9px;
            }
            .order-info h2 {
              font-size: 12px;
              margin: 0 0 5px 0;
            }
            .customer-info {
              margin-bottom: 15px;
              padding: 8px;
              background-color: #f3f4f6;
              border: 1.5px solid #000;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
              font-size: 8px;
            }
            th {
              background-color: #f3f4f6;
              padding: 5px;
              text-align: left;
              border-bottom: 1.5px solid #000;
              font-size: 8px;
            }
            td {
              padding: 4px 5px;
            }
            .total-row {
              font-weight: bold;
              font-size: 10px;
            }
            .notes {
              margin-top: 15px;
              padding: 8px;
              background-color: #f9fafb;
              border-left: 3px solid #000;
              font-size: 8px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
              <div>
                <div class="company-name">${companyName}</div>
                ${companyAddress ? `<div style="font-size: 8px; margin-top: 3px;">${companyAddress}</div>` : ''}
                ${companyEmail ? `<div style="font-size: 8px; margin-top: 2px;">${companyEmail}</div>` : ''}
              </div>
            </div>
            <div class="order-info">
              <h2>Order #${order.id.slice(0, 8)}</h2>
              <p>${new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
            </div>
          </div>
          
          <div class="customer-info" style="display: flex; justify-content: space-between; align-items: center;">
            <div><strong>Customer:</strong> ${order.profiles?.full_name || 'N/A'}</div>
            ${order.profiles?.cart_name || order.profiles?.cart_number ? `<div><strong>Cart:</strong> ${order.profiles?.cart_name || ''} ${order.profiles?.cart_number || ''}</div>` : ''}
            ${order.assigned_worker ? `<div><strong>Processed by:</strong> ${order.assigned_worker.full_name || order.assigned_worker.email}</div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Box Size</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="4" style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Subtotal:</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${(Number(order.total) - serviceFee).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Service Fee:</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">$${serviceFee.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="padding: 15px 8px; text-align: right;">TOTAL:</td>
                <td style="padding: 15px 8px; text-align: right;">$${Number(order.total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage products, users, and app settings</p>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-3xl mx-auto">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Folder className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Dialog open={showProductDialog} onOpenChange={(open) => {
              setShowProductDialog(open);
              if (!open) {
                setEditingProduct(null);
                setImageFile(null);
                setImagePreview(null);
                setSelectedBoxSizes(['1 box']);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingProduct(null);
                  setImageFile(null);
                  setImagePreview(null);
                  setSelectedBoxSizes(['1 box']);
                }} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Update' : 'Create a new'} product in the inventory
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image">Product Image</Label>
                    <div className="flex flex-col gap-3">
                      {(imagePreview || editingProduct?.image_url) && (
                        <div className="relative w-full h-40 rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={imagePreview || editingProduct?.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          {imagePreview && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview(null);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="relative">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProduct?.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={editingProduct?.description}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        defaultValue={editingProduct?.price}
                        required
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        defaultValue={editingProduct?.quantity}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Select name="category_id" defaultValue={editingProduct?.category_id} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Box Sizes</Label>
                    <div className="space-y-2">
                      {BOX_SIZE_OPTIONS.map((size) => (
                        <div key={size} className="flex items-center space-x-2">
                          <Checkbox
                            id={size}
                            checked={selectedBoxSizes.includes(size)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBoxSizes([...selectedBoxSizes, size]);
                              } else {
                                setSelectedBoxSizes(selectedBoxSizes.filter(s => s !== size));
                              }
                            }}
                          />
                          <Label htmlFor={size} className="cursor-pointer font-normal">
                            {size}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingProduct ? 'Update' : 'Create'} Product
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Box Sizes</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.categories?.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(product.box_sizes || ['1 box']).map((size: string) => (
                              <Badge key={size} variant="outline" className="text-xs">
                                {size}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={product.quantity < 10 ? 'destructive' : 'secondary'}>
                            {product.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setImagePreview(null);
                                setImageFile(null);
                                setSelectedBoxSizes(product.box_sizes || ['1 box']);
                                setShowProductDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Dialog open={showCategoryDialog} onOpenChange={(open) => {
              setShowCategoryDialog(open);
              if (!open) {
                setEditingCategory(null);
              }
            }}>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Categories</h2>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingCategory(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
              </div>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update' : 'Add a new'} product category
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingCategory?.name}
                      required
                      maxLength={100}
                      placeholder="e.g., Snacks, Beverages, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      name="description"
                      defaultValue={editingCategory?.description || ''}
                      maxLength={500}
                      placeholder="Brief description of this category"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCategory ? 'Update' : 'Create'} Category
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No categories found. Create your first category to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category.description || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(category.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setShowCategoryDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{category.name}"? This action cannot be undone. Categories with existing products cannot be deleted.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            {order.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.profiles?.full_name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{order.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.order_items?.length || 0} item(s)
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(order.total).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => printOrder(order)}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this order? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteOrder(order.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
                      <DialogDescription>
                        Complete order information and items
                      </DialogDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedOrder && printOrder(selectedOrder)}
                      className="gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print Order
                    </Button>
                  </div>
                </DialogHeader>
                {selectedOrder && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{selectedOrder.profiles?.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Order Date</p>
                        <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={getStatusColor(selectedOrder.status)}>
                          {selectedOrder.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-lg font-bold text-primary">
                          ${Number(selectedOrder.total).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Order Items</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Box Size</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.order_items?.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.products?.name}</TableCell>
                              <TableCell>{item.box_size || '1 box'}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${Number(item.price).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                ${(item.quantity * Number(item.price)).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t">
                            <TableCell colSpan={4} className="text-right font-medium">
                              Subtotal:
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${(Number(selectedOrder.total) - serviceFee).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} className="text-right font-medium">
                              Service Fee:
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${serviceFee.toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="text-right font-bold">
                              Total:
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              ${Number(selectedOrder.total).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {selectedOrder.notes && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-semibold mb-2 text-sm">Customer Notes</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedOrder.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Dialog open={showUserDialog} onOpenChange={(open) => {
              setShowUserDialog(open);
              if (!open) setEditingUser(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User Profile</DialogTitle>
                  <DialogDescription>
                    Update user profile information
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateUserProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_full_name">Full Name</Label>
                    <Input
                      id="edit_full_name"
                      name="full_name"
                      defaultValue={editingUser?.full_name || ''}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_phone">Phone Number</Label>
                    <Input
                      id="edit_phone"
                      name="phone"
                      defaultValue={editingUser?.phone || ''}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_cart_name">Cart Name</Label>
                    <Input
                      id="edit_cart_name"
                      name="cart_name"
                      defaultValue={editingUser?.cart_name || ''}
                      placeholder="Enter cart name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_cart_number">Cart Number</Label>
                    <Input
                      id="edit_cart_number"
                      name="cart_number"
                      defaultValue={editingUser?.cart_number || ''}
                      placeholder="Enter cart number"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Update Profile
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Cart Info</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.cart_name && <div>{user.cart_name}</div>}
                            {user.cart_number && <div className="text-muted-foreground">#{user.cart_number}</div>}
                            {!user.cart_name && !user.cart_number && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.user_roles?.[0]?.role || 'customer'}
                            onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="worker">Worker</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setShowUserDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will send a password reset email to {user.email}. 
                                    Are you sure you want to continue?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetUserPassword(user.id, user.email)}>
                                    Send Reset Email
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete {user.email}? This will delete their profile, roles, and account. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>App Branding Settings</CardTitle>
                {!isSuperAdmin && (
                  <p className="text-sm text-muted-foreground">
                    <Eye className="w-4 h-4 inline mr-1" />
                    View Only - Contact super admin to make changes
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Enter company name"
                    disabled={!isSuperAdmin}
                  />
                  {isSuperAdmin && (
                    <Button
                    onClick={async () => {
                      // Validate company name
                      const validation = settingsSchema.pick({ company_name: true }).safeParse({ company_name: settings.company_name });
                      if (!validation.success) {
                        toast.error(validation.error.errors[0].message);
                        return;
                      }

                      const { error } = await supabase
                        .from('app_settings')
                        .update({ value: validation.data.company_name })
                        .eq('key', 'company_name');
                      
                      if (error) {
                        toast.error('Failed to update company name');
                      } else {
                        toast.success('Company name updated');
                      }
                    }}
                    className="mt-2"
                  >
                    Save Company Name
                  </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  {settings.logo_url && (
                    <div className="mb-2">
                      <img src={settings.logo_url} alt="Logo" className="h-20 w-auto object-contain border rounded p-2" />
                    </div>
                  )}
                  {isSuperAdmin && (
                    <>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                      <Button
                    onClick={async () => {
                      if (!logoFile) {
                        toast.error('Please select a logo file');
                        return;
                      }

                      const fileExt = logoFile.name.split('.').pop();
                      const fileName = `logo.${fileExt}`;
                      const filePath = `${fileName}`;

                      console.log('Uploading logo to:', filePath);
                      const { error: uploadError } = await supabase.storage
                        .from('branding')
                        .upload(filePath, logoFile, { upsert: true });

                      if (uploadError) {
                        console.error('Logo upload error:', uploadError);
                        toast.error(`Failed to upload logo: ${uploadError.message}`);
                        return;
                      }
                      console.log('Logo uploaded successfully');

                      const { data } = supabase.storage
                        .from('branding')
                        .getPublicUrl(filePath);

                      const { error } = await supabase
                        .from('app_settings')
                        .update({ value: data.publicUrl })
                        .eq('key', 'logo_url');

                      if (error) {
                        toast.error('Failed to update logo');
                      } else {
                        toast.success('Logo updated');
                        fetchSettings();
                        setLogoFile(null);
                      }
                    }}
                        disabled={!logoFile}
                        className="mt-2"
                      >
                        Upload Logo
                      </Button>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceFee">Service Fee ($)</Label>
                  <Input
                    id="serviceFee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.service_fee || '0'}
                    onChange={(e) => setSettings({ ...settings, service_fee: e.target.value })}
                    placeholder="Enter service fee"
                    disabled={!isSuperAdmin}
                  />
                  {isSuperAdmin && (
                    <Button
                    onClick={async () => {
                      const fee = parseFloat(settings.service_fee || '0');
                      if (isNaN(fee) || fee < 0) {
                        toast.error('Please enter a valid service fee');
                        return;
                      }

                      const { error } = await supabase
                        .from('app_settings')
                        .upsert({ key: 'service_fee', value: fee.toString() }, { onConflict: 'key' });
                      
                      if (error) {
                        toast.error('Failed to update service fee');
                      } else {
                        toast.success('Service fee updated');
                      }
                    }}
                    className="mt-2"
                  >
                    Save Service Fee
                  </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Login Background Image</Label>
                  {settings.login_background_url && (
                    <div className="mb-2">
                      <img src={settings.login_background_url} alt="Background" className="h-32 w-auto object-cover border rounded" />
                    </div>
                  )}
                  {isSuperAdmin && (
                    <>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBgFile(e.target.files?.[0] || null)}
                      />
                      <Button
                    onClick={async () => {
                      if (!bgFile) {
                        toast.error('Please select a background image');
                        return;
                      }

                      const fileExt = bgFile.name.split('.').pop();
                      const fileName = `background.${fileExt}`;
                      const filePath = `${fileName}`;

                      console.log('Uploading background to:', filePath);
                      const { error: uploadError } = await supabase.storage
                        .from('branding')
                        .upload(filePath, bgFile, { upsert: true });

                      if (uploadError) {
                        console.error('Background upload error:', uploadError);
                        toast.error(`Failed to upload background: ${uploadError.message}`);
                        return;
                      }
                      console.log('Background uploaded successfully');

                      const { data } = supabase.storage
                        .from('branding')
                        .getPublicUrl(filePath);

                      const { error } = await supabase
                        .from('app_settings')
                        .update({ value: data.publicUrl })
                        .eq('key', 'login_background_url');

                      if (error) {
                        toast.error('Failed to update background');
                      } else {
                        toast.success('Background updated');
                        fetchSettings();
                        setBgFile(null);
                      }
                    }}
                        disabled={!bgFile}
                        className="mt-2"
                      >
                        Upload Background
                      </Button>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blurAmount">Login Background Blur (px)</Label>
                  <Input
                    id="blurAmount"
                    type="number"
                    min="0"
                    max="20"
                    value={settings.login_blur_amount}
                    onChange={(e) => setSettings({ ...settings, login_blur_amount: e.target.value })}
                    placeholder="2"
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    Control the background blur amount (0 = no blur, 20 = maximum blur)
                  </p>
                  {isSuperAdmin && (
                    <Button
                    onClick={async () => {
                      const blurValue = parseInt(settings.login_blur_amount);
                      if (isNaN(blurValue) || blurValue < 0 || blurValue > 20) {
                        toast.error('Blur amount must be between 0 and 20');
                        return;
                      }

                      const { error } = await supabase
                        .from('app_settings')
                        .upsert({ 
                          key: 'login_blur_amount', 
                          value: settings.login_blur_amount 
                        }, {
                          onConflict: 'key'
                        });
                      
                      if (error) {
                        toast.error('Failed to update blur amount');
                      } else {
                        toast.success('Blur amount updated');
                      }
                    }}
                    className="mt-2"
                  >
                    Save Blur Amount
                  </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="activeTheme">App Theme</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Choose and manage the visual theme for your app
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select
                      value={activeTheme}
                      onValueChange={handleUpdateTheme}
                      disabled={!isSuperAdmin}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Theme</SelectItem>
                        <SelectItem value="halloween">🎃 Halloween Neon Cyber (Purple, Orange & Green)</SelectItem>
                        <SelectItem value="christmas">🎄 Christmas Classic (Red & Green with Lights)</SelectItem>
                        <SelectItem value="christmas-wonderland">❄️ Christmas Wonderland (Blue & Silver with Sparkles)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {isSuperAdmin && activeTheme !== 'default' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="flex-shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {activeTheme === 'halloween' ? 'Halloween Neon Cyber' : activeTheme === 'christmas' ? 'Christmas Classic' : 'Christmas Wonderland'} Theme?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will switch to the default theme. You can reactivate {activeTheme === 'halloween' ? 'Halloween Neon Cyber' : activeTheme === 'christmas' ? 'Christmas Classic' : 'Christmas Wonderland'} anytime by selecting it from the dropdown.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTheme}>
                              Remove Theme
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {activeTheme === 'halloween' && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1">🎃 Halloween Neon Cyber Theme Active</p>
                      <p className="text-xs text-muted-foreground">
                        Features: Dark purple background, neon orange/green accents, glowing cyber effects, and spooky vibes
                      </p>
                    </div>
                  )}

                  {activeTheme === 'christmas' && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1">🎄 Christmas Classic Theme Active</p>
                      <p className="text-xs text-muted-foreground">
                        Features: Red & Green colors, falling snow, twinkling Christmas lights wrapping cards, and festive sparkles
                      </p>
                    </div>
                  )}

                  {activeTheme === 'christmas-wonderland' && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                      <p className="text-sm font-medium mb-1">❄️ Christmas Wonderland Theme Active</p>
                      <p className="text-xs text-muted-foreground">
                        Features: Blue & Silver colors, magical snowfall, icy shimmer effects, and sparkling winter lights
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
