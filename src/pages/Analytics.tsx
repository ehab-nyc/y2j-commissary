import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BackButton } from "@/components/BackButton";
import { SalesMetrics } from "@/components/analytics/SalesMetrics";
import { SalesChart } from "@/components/analytics/SalesChart";
import { TopProducts } from "@/components/analytics/TopProducts";
import { CategoryBreakdown } from "@/components/analytics/CategoryBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItemsSold: number;
  dailySales: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  categoryBreakdown: Array<{ name: string; value: number }>;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalItemsSold: 0,
    dailySales: [],
    topProducts: [],
    categoryBreakdown: [],
  });
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Fetch completed orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          created_at,
          status,
          order_items (
            id,
            quantity,
            price,
            product_id,
            products (
              id,
              name,
              category_id,
              categories (
                name
              )
            )
          )
        `)
        .eq("status", "completed")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      if (ordersError) throw ordersError;

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate total items sold
      const totalItemsSold = orders?.reduce((sum, order) => {
        return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
      }, 0) || 0;

      // Group by date for chart
      const salesByDate = new Map<string, { revenue: number; orders: number }>();
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), "MMM dd");
        const existing = salesByDate.get(date) || { revenue: 0, orders: 0 };
        salesByDate.set(date, {
          revenue: existing.revenue + Number(order.total),
          orders: existing.orders + 1,
        });
      });

      const dailySales = Array.from(salesByDate.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Calculate top products
      const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();
      orders?.forEach(order => {
        order.order_items?.forEach(item => {
          const productName = item.products?.name || "Unknown";
          const existing = productStats.get(productName) || { name: productName, quantity: 0, revenue: 0 };
          productStats.set(productName, {
            name: productName,
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (Number(item.price) * item.quantity),
          });
        });
      });

      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate category breakdown
      const categoryStats = new Map<string, number>();
      orders?.forEach(order => {
        order.order_items?.forEach(item => {
          const categoryName = item.products?.categories?.name || "Uncategorized";
          const revenue = Number(item.price) * item.quantity;
          categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + revenue);
        });
      });

      const categoryBreakdown = Array.from(categoryStats.entries()).map(([name, value]) => ({
        name,
        value,
      }));

      setData({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItemsSold,
        dailySales,
        topProducts,
        categoryBreakdown,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <h1 className="text-3xl font-bold">Sales Analytics</h1>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                  />
                </PopoverContent>
              </Popover>
              <span>to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={fetchAnalytics}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <SalesMetrics
              totalRevenue={data.totalRevenue}
              totalOrders={data.totalOrders}
              averageOrderValue={data.averageOrderValue}
              totalItemsSold={data.totalItemsSold}
            />

            <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
              <SalesChart data={data.dailySales} />
              <CategoryBreakdown data={data.categoryBreakdown} />
            </div>

            <div className="max-w-5xl">
              <TopProducts products={data.topProducts} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
