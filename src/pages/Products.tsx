import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Minus, ShoppingCart, Search, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ProductRecommendations } from '@/components/ProductRecommendations';
import { AIChatbot } from '@/components/AIChatbot';
import { TranslateButton } from '@/components/TranslateButton';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category_id: string;
  image_url: string | null;
  categories: { name: string } | null;
  box_sizes: string[];
}

interface TranslatedContent {
  name?: string;
  description?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  boxSize: string;
}

const Products = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [boxSizes, setBoxSizes] = useState<Record<string, string>>({});
  const [serviceFee, setServiceFee] = useState<number>(10);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; name: string } | null>(null);
  const [translatedProducts, setTranslatedProducts] = useState<Record<string, TranslatedContent>>({});

  useEffect(() => {
    fetchProducts(true); // Reset box sizes on initial load
    fetchCategories();
    loadCartFromEdit();
    fetchServiceFee();
  }, []);

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

  const loadCartFromEdit = async () => {
    const editCartData = sessionStorage.getItem('editOrderCart');
    const editOrderId = sessionStorage.getItem('editOrderId');
    const editOrderItemId = sessionStorage.getItem('editOrderItemId');
    const keepOrderId = sessionStorage.getItem('keepOrderId');
    
    if (editCartData && editOrderId) {
      try {
        const cartData = JSON.parse(editCartData);
        
        // Verify order is still in pending status before proceeding
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('status')
          .eq('id', editOrderId)
          .single();

        if (orderError || !order) {
          toast.error('Order not found or already deleted');
          sessionStorage.removeItem('editOrderCart');
          sessionStorage.removeItem('editOrderId');
          sessionStorage.removeItem('editOrderItemId');
          sessionStorage.removeItem('keepOrderId');
          return;
        }

        if (order.status !== 'pending') {
          toast.error('Cannot edit order - it is being processed or completed');
          sessionStorage.removeItem('editOrderCart');
          sessionStorage.removeItem('editOrderId');
          sessionStorage.removeItem('editOrderItemId');
          sessionStorage.removeItem('keepOrderId');
          return;
        }
        
        // Fetch full product details for each cart item
        const { data: products } = await supabase
          .from('products')
          .select('*, categories(name)')
          .in('id', cartData.map((item: any) => item.productId));
        
        if (products) {
          const loadedCart = cartData.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            return product ? {
              product,
              quantity: item.quantity,
              boxSize: item.boxSize,
            } : null;
          }).filter(Boolean);
          
          setCart(loadedCart as CartItem[]);
          
          // If keeping order, just delete the item being edited
          if (keepOrderId && editOrderItemId) {
            const { error: deleteError } = await supabase
              .from('order_items')
              .delete()
              .eq('id', editOrderItemId);
            
            if (deleteError) {
              toast.error('Failed to remove original item');
              console.error('Delete error:', deleteError);
            } else {
              toast.success('Item loaded for editing - order will be updated');
            }
          }
        }
        
        // Don't clear sessionStorage yet - keep editOrderId for placeOrder to use
      } catch (error) {
        console.error('Error loading cart from edit:', error);
        toast.error('Failed to load order for editing');
        // Clear sessionStorage on error to prevent retry loops
        sessionStorage.removeItem('editOrderCart');
        sessionStorage.removeItem('editOrderId');
        sessionStorage.removeItem('editOrderItemId');
        sessionStorage.removeItem('keepOrderId');
      }
    }
  };

  const fetchProducts = async (resetBoxSizes: boolean = false) => {
    console.log('Fetching products...');
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      toast.error(`Failed to load products: ${error.message}`);
    } else {
      console.log('Products fetched:', data);
      setProducts(data || []);
      // Only initialize box sizes on first load, not on refetch
      if (resetBoxSizes) {
        const initialBoxSizes: Record<string, string> = {};
        data?.forEach(product => {
          initialBoxSizes[product.id] = product.box_sizes?.[0] || '1 box';
        });
        setBoxSizes(initialBoxSizes);
      }
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    console.log('Fetching categories...');
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      console.log('Categories fetched:', data);
    }
    setCategories(data || []);
  };

  const getBoxSizeMultiplier = (boxSize: string): number => {
    if (boxSize === '1/2 box') return 0.5;
    if (boxSize === '1/4 box') return 0.25;
    return 1;
  };

  const addToCart = (product: Product, boxSize: string) => {
    console.log('Adding to cart:', product.name, 'Box size:', boxSize);
    const existing = cart.find(item => item.product.id === product.id && item.boxSize === boxSize);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id && item.boxSize === boxSize
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error('Not enough stock available');
      }
    } else {
      setCart([...cart, { product, quantity: 1, boxSize }]);
    }
  };

  const removeFromCart = (productId: string, boxSize: string) => {
    const existing = cart.find(item => item.product.id === productId && item.boxSize === boxSize);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId && item.boxSize === boxSize
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => !(item.product.id === productId && item.boxSize === boxSize)));
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error(t('products.cartEmpty'));
      return;
    }

    // Check authentication
    if (!user?.id) {
      toast.error('Please log in to place an order');
      return;
    }

    // Validation schema for order items
    const orderItemSchema = z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive().max(1000, 'Quantity cannot exceed 1000'),
      box_size: z.enum(['1 box', '1/2 box', '1/4 box'], { 
        errorMap: () => ({ message: 'Invalid box size' }) 
      }),
    });

    // Validate all cart items
    for (const item of cart) {
      const validation = orderItemSchema.safeParse({
        product_id: item.product.id,
        quantity: item.quantity,
        box_size: item.boxSize,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      // Check stock availability
      if (item.quantity > item.product.quantity) {
        toast.error(`Insufficient stock for ${item.product.name}. Available: ${item.product.quantity}`);
        return;
      }
    }

    // SECURITY NOTE: Order total is calculated server-side via database triggers:
    // - recalculate_order_item_price: Overrides item prices with current product prices
    // - recalculate_order_total: Recalculates order total from validated item prices + service fee
    // Client-side total is for UX display only. Server trigger is the source of truth.
    // Tampering with client-side values has no effect on actual charges.

    // Check if we're editing an existing order
    const editOrderId = sessionStorage.getItem('editOrderId');
    const keepOrderId = sessionStorage.getItem('keepOrderId');
    
    let orderId = editOrderId && keepOrderId ? editOrderId : null;

    // If not editing or keeping order, create a new one
    if (!orderId) {
      // SECURITY: Total is set to 0 and will be calculated by server-side trigger
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          total: 0, // Trigger will recalculate
          status: 'pending',
        })
        .select()
        .single();

      if (orderError || !order) {
        toast.error(orderError?.message || 'Failed to create order. Please try again.');
        return;
      }
      orderId = order.id;
    }

    // SECURITY NOTE: Client-provided prices are overridden by recalculate_order_item_price trigger
    const orderItems = cart.map(item => ({
      order_id: orderId,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price * getBoxSizeMultiplier(item.boxSize), // Overridden by DB trigger
      box_size: item.boxSize,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      toast.error(itemsError?.message || 'Failed to add items to order');
    } else {
      const message = keepOrderId ? 'Order updated successfully!' : 'Order placed successfully!';
      toast.success(message);
      setCart([]);
      
      // Clear edit-related sessionStorage
      sessionStorage.removeItem('editOrderCart');
      sessionStorage.removeItem('editOrderId');
      sessionStorage.removeItem('editOrderItemId');
      sessionStorage.removeItem('keepOrderId');
      
      fetchProducts(false); // Don't reset box sizes when refetching after order
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartSubtotal = cart.reduce((sum, item) => {
    const pricePerUnit = item.product.price * getBoxSizeMultiplier(item.boxSize);
    return sum + pricePerUnit * item.quantity;
  }, 0);
  const cartTotal = cartSubtotal + serviceFee;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('products.title')}</h1>
            <p className="text-muted-foreground">{t('products.subtitle')}</p>
          </div>
          
          {cartCount > 0 && (
            <div className="flex flex-col gap-2 items-end">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Subtotal: ${cartSubtotal.toFixed(2)}</div>
                <div>Service Fee: ${serviceFee.toFixed(2)}</div>
                <div className="font-semibold text-foreground">Total: ${cartTotal.toFixed(2)}</div>
              </div>
              <Button onClick={placeOrder} size="lg" className="gap-2 shadow-elevated">
                <ShoppingCart className="w-5 h-5" />
                {t('products.placeOrder')}
                <Badge variant="secondary" className="ml-1">{cartCount}</Badge>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('products.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('products.allCategories')}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ProductRecommendations 
          onAddToCart={(productId) => {
            const product = products.find(p => p.id === productId);
            if (product) {
              const defaultBoxSize = product.box_sizes?.[0] || '1 box';
              addToCart(product, defaultBoxSize);
              toast.success(`${product.name} added to cart`);
            }
          }}
        />

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const selectedBoxSize = boxSizes[product.id] || product.box_sizes?.[0] || '1 box';
              const cartItem = cart.find(item => item.product.id === product.id && item.boxSize === selectedBoxSize);
              const inCart = cartItem?.quantity || 0;
              
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-elevated transition-shadow">
                  {product.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted relative group">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setFullscreenImage({ url: product.image_url!, name: product.name })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        aria-label="View fullscreen"
                      >
                        <Maximize2 className="w-8 h-8 text-white" />
                      </button>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {translatedProducts[product.id]?.name || product.name}
                        </CardTitle>
                        <div className="flex items-start gap-2">
                          <CardDescription className="line-clamp-2 flex-1">
                            {translatedProducts[product.id]?.description || product.description}
                          </CardDescription>
                          <TranslateButton
                            text={`${product.name}\n\n${product.description}`}
                            context="product"
                            size="sm"
                            onTranslated={(translated) => {
                              const [name, ...descParts] = translated.split('\n\n');
                              setTranslatedProducts(prev => ({
                                ...prev,
                                [product.id]: {
                                  name: name.trim(),
                                  description: descParts.join('\n\n').trim()
                                }
                              }));
                            }}
                          />
                        </div>
                      </div>
                      <Badge variant="outline">{product.categories?.name}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary">
                        ${(product.price * getBoxSizeMultiplier(selectedBoxSize)).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">{t('products.stock')}: {product.quantity}</span>
                    </div>
                    {product.box_sizes && product.box_sizes.length > 1 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('products.boxSize')}</label>
                        <Select 
                          value={selectedBoxSize} 
                          onValueChange={(value) => {
                            console.log('Box size changed:', product.name, 'from', selectedBoxSize, 'to', value);
                            setBoxSizes(prev => ({ ...prev, [product.id]: value }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select box size" />
                          </SelectTrigger>
                          <SelectContent>
                            {product.box_sizes.map(size => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    {inCart > 0 ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button variant="outline" size="icon" onClick={() => removeFromCart(product.id, selectedBoxSize)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center font-semibold">{inCart}</div>
                        <Button 
                          size="icon" 
                          onClick={() => addToCart(product, selectedBoxSize)}
                          disabled={inCart >= product.quantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(product, selectedBoxSize)} 
                        className="w-full gap-2"
                        disabled={product.quantity === 0}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {t('products.addToCart')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              aria-label="Close fullscreen"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {fullscreenImage && (
              <img
                src={fullscreenImage.url}
                alt={fullscreenImage.name}
                className="w-full h-full object-contain animate-scale-in"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AIChatbot />
    </DashboardLayout>
  );
};

export default Products;
