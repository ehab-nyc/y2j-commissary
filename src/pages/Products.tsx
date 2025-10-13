import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, ShoppingCart, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category_id: string;
  image_url: string | null;
  categories: { name: string } | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');

    if (error) {
      toast.error('Failed to load products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error('Not enough stock available');
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existing = cart.find(item => item.product.id === productId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user?.id,
        total,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError || !order) {
      toast.error('Failed to create order');
      return;
    }

    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      toast.error('Failed to add items to order');
    } else {
      toast.success('Order placed successfully!');
      setCart([]);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Browse and order from our inventory</p>
          </div>
          
          {cartCount > 0 && (
            <Button onClick={placeOrder} size="lg" className="gap-2 shadow-elevated">
              <ShoppingCart className="w-5 h-5" />
              Place Order (${cartTotal.toFixed(2)})
              <Badge variant="secondary" className="ml-1">{cartCount}</Badge>
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product.id === product.id);
              const inCart = cartItem?.quantity || 0;
              
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-elevated transition-shadow">
                  {product.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant="outline">{product.categories?.name}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">Stock: {product.quantity}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    {inCart > 0 ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button variant="outline" size="icon" onClick={() => removeFromCart(product.id)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center font-semibold">{inCart}</div>
                        <Button 
                          size="icon" 
                          onClick={() => addToCart(product)}
                          disabled={inCart >= product.quantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(product)} 
                        className="w-full gap-2"
                        disabled={product.quantity === 0}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
