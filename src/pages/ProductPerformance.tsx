import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Package, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface ProductPerformance {
  id: string;
  name: string;
  category_name: string | null;
  current_stock: number;
  cost_price: number;
  selling_price: number;
  total_sold: number;
  order_count: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  sales_velocity: number;
  days_of_stock: number | null;
  first_sale_date: string | null;
  last_sale_date: string | null;
}

export default function ProductPerformance() {
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchProductPerformance();
  }, []);

  const fetchProductPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('product_performance_stats')
        .select('*')
        .order('total_sold', { ascending: false });

      if (error) {
        console.error('Error fetching product performance:', error);
        throw error;
      }
      
      console.log('Product performance data:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch product performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fastMovers = products.filter(p => (p.sales_velocity ?? 0) > 1 && (p.total_sold ?? 0) > 0);
  const slowMovers = products.filter(p => ((p.sales_velocity ?? 0) <= 0.5 || (p.total_sold ?? 0) === 0) && p.days_of_stock !== null);
  const profitLeaders = [...products].sort((a, b) => (b.total_profit ?? 0) - (a.total_profit ?? 0)).slice(0, 10);

  const calculateProfitMargin = (revenue: number, cost: number) => {
    if (revenue === 0) return 0;
    return ((revenue - cost) / revenue * 100);
  };

  const getSalesVelocityColor = (velocity: number) => {
    if (velocity > 2) return 'text-green-600 font-semibold';
    if (velocity > 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDaysOfStockColor = (days: number | null) => {
    if (days === null) return 'text-gray-500';
    if (days < 7) return 'text-red-600 font-semibold';
    if (days < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const renderProductTable = (productList: ProductPerformance[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Total Sold</TableHead>
          <TableHead className="text-right">Sales/Day</TableHead>
          <TableHead className="text-right">Days of Stock</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">Margin %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              No products found
            </TableCell>
          </TableRow>
        ) : (
          productList.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                {product.category_name && (
                  <Badge variant="outline">{product.category_name}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{product.current_stock ?? 0}</TableCell>
              <TableCell className="text-right">{product.total_sold ?? 0}</TableCell>
              <TableCell className={`text-right ${getSalesVelocityColor(product.sales_velocity ?? 0)}`}>
                {(product.sales_velocity ?? 0).toFixed(2)}
              </TableCell>
              <TableCell className={`text-right ${getDaysOfStockColor(product.days_of_stock)}`}>
                {product.days_of_stock !== null ? product.days_of_stock.toFixed(0) : 'N/A'}
              </TableCell>
              <TableCell className="text-right">${(product.total_revenue ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right font-semibold">${(product.total_profit ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {calculateProfitMargin(product.total_revenue ?? 0, product.total_cost ?? 0).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const totalRevenue = products.reduce((sum, p) => sum + (p.total_revenue ?? 0), 0);
  const totalProfit = products.reduce((sum, p) => sum + (p.total_profit ?? 0), 0);
  const totalSold = products.reduce((sum, p) => sum + (p.total_sold ?? 0), 0);
  const averageMargin = products.length > 0 
    ? products.reduce((sum, p) => sum + calculateProfitMargin(p.total_revenue, p.total_cost), 0) / products.length 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <BackButton />
          <h1 className="text-3xl font-bold mt-2">Product Performance Analytics</h1>
          <p className="text-muted-foreground">Analyze sales velocity, profitability, and inventory turnover</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From all products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Avg. margin: {averageMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSold}</div>
              <p className="text-xs text-muted-foreground">Total items moved</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">In inventory</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-4">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="fast">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fast Movers ({fastMovers.length})
            </TabsTrigger>
            <TabsTrigger value="slow">
              <TrendingDown className="h-4 w-4 mr-2" />
              Slow Movers ({slowMovers.length})
            </TabsTrigger>
            <TabsTrigger value="profit">Top Profit</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>Complete product performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading data...</div>
                ) : (
                  renderProductTable(products)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fast" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Fast Moving Products
                </CardTitle>
                <CardDescription>
                  Products with sales velocity {'>'} 1 unit/day - High demand items that need frequent restocking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(fastMovers)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slow" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Slow Moving Products
                </CardTitle>
                <CardDescription>
                  Products with sales velocity {'<'} 0.5 units/day - Consider promotions or discontinuation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(slowMovers)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Top Profit Generators
                </CardTitle>
                <CardDescription>
                  Products contributing the most to overall profitability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderProductTable(profitLeaders)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Understanding the Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Sales Velocity:</strong> Average units sold per day. Higher is better for turnover.</p>
            <p><strong>Days of Stock:</strong> How long current inventory will last at current sales rate. {'<'}7 days means reorder soon.</p>
            <p><strong>Profit Margin:</strong> Percentage of revenue kept as profit after costs.</p>
            <p><strong className="text-green-600">Fast Movers:</strong> {'>'} 1 unit/day - High demand, ensure adequate stock.</p>
            <p><strong className="text-red-600">Slow Movers:</strong> {'<'} 0.5 units/day - Low demand, consider discounts or removal.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
