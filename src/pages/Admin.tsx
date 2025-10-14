import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Package, Upload, X, KeyRound, ShoppingBag, ClipboardList, Eye, Folder } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Validation schemas
const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200, "Product name must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  price: z.number().positive("Price must be positive").max(999999.99, "Price must be less than 1,000,000"),
  quantity: z.number().int("Quantity must be a whole number").min(0, "Quantity cannot be negative").max(999999, "Quantity must be less than 1,000,000"),
  category_id: z.string().uuid("Invalid category selected"),
});

const brandingSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
});

const roleSchema = z.enum(['customer', 'worker', 'manager', 'admin']);

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(100, "Category name must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional(),
});

const Admin = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBoxSizes, setSelectedBoxSizes] = useState<string[]>(['1 box']);
  const [settings, setSettings] = useState({ company_name: '', logo_url: '', login_background_url: '', login_blur_amount: '2' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  const BOX_SIZE_OPTIONS = ['1 box', '1/2 box', '1/4 box'];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUsers();
    fetchOrders();
    fetchSettings();
  }, []);

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
    setUsers(data || []);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(email, full_name),
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
      .in('key', ['company_name', 'logo_url', 'login_background_url', 'login_blur_amount']);
    
    if (data) {
      const settingsObj = data.reduce((acc: any, item) => {
        acc[item.key] = item.value || '';
        return acc;
      }, {});
      setSettings({
        company_name: settingsObj.company_name || 'Commissary System',
        logo_url: settingsObj.logo_url || '',
        login_background_url: settingsObj.login_background_url || '',
        login_blur_amount: settingsObj.login_blur_amount || '2'
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage products, users, and app settings</p>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl">
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
                        defaultValue={editingProduct?.price}
                        required
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
              <CardContent className="p-0">
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
                  <DialogTitle>Order Details - #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
                  <DialogDescription>
                    Complete order information and items
                  </DialogDescription>
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <KeyRound className="w-4 h-4" />
                                Reset Password
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
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Enter company name"
                  />
                  <Button 
                    onClick={async () => {
                      // Validate company name
                      const validation = brandingSchema.safeParse({ company_name: settings.company_name });
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
                </div>

                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  {settings.logo_url && (
                    <div className="mb-2">
                      <img src={settings.logo_url} alt="Logo" className="h-20 w-auto object-contain border rounded p-2" />
                    </div>
                  )}
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

                      const { error: uploadError } = await supabase.storage
                        .from('branding')
                        .upload(filePath, logoFile, { upsert: true });

                      if (uploadError) {
                        toast.error('Failed to upload logo');
                        return;
                      }

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
                </div>

                <div className="space-y-2">
                  <Label>Login Background Image</Label>
                  {settings.login_background_url && (
                    <div className="mb-2">
                      <img src={settings.login_background_url} alt="Background" className="h-32 w-auto object-cover border rounded" />
                    </div>
                  )}
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

                      const { error: uploadError } = await supabase.storage
                        .from('branding')
                        .upload(filePath, bgFile, { upsert: true });

                      if (uploadError) {
                        toast.error('Failed to upload background');
                        return;
                      }

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
                  />
                  <p className="text-xs text-muted-foreground">
                    Control the background blur amount (0 = no blur, 20 = maximum blur)
                  </p>
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
