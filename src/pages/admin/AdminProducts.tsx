import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productSchema } from '@/lib/validation';
import { BulkProductImport } from '@/components/inventory/BulkProductImport';

const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBoxSizes, setSelectedBoxSizes] = useState<string[]>(['1 box']);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const BOX_SIZE_OPTIONS = ['1 box', '1/2 box', '1/4 box'];

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawData = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      price: parseFloat(formData.get('price') as string),
      quantity: parseInt(formData.get('quantity') as string),
      category_id: formData.get('category_id') as string,
    };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton to="/admin" label="Back to Admin Panel" />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage product inventory</p>
          </div>
          <div className="flex gap-2">
            <BulkProductImport onImportComplete={fetchProducts} />
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
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
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Box Sizes</Label>
                <div className="flex flex-col gap-2">
                  {BOX_SIZE_OPTIONS.map((size) => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`box-${size}`}
                        checked={selectedBoxSizes.includes(size)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBoxSizes([...selectedBoxSizes, size]);
                          } else {
                            setSelectedBoxSizes(selectedBoxSizes.filter(s => s !== size));
                          }
                        }}
                      />
                      <label htmlFor={`box-${size}`} className="text-sm font-medium">
                        {size}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowProductDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Box Sizes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.categories?.name}</TableCell>
                <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>{product.box_sizes?.join(', ') || '1 box'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingProduct(product);
                        setSelectedBoxSizes(product.box_sizes || ['1 box']);
                        setShowProductDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this product? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                            Delete
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
      </div>
    </DashboardLayout>
  );
};

export default AdminProducts;
