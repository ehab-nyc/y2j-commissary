import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export function LowStockAlerts() {
  const { data: lowStockProducts, isLoading } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .filter("quantity", "lte", "low_stock_threshold")
        .eq("active", true)
        .order("quantity", { ascending: true });

      if (error) throw error;
      // Filter in memory for products where quantity <= low_stock_threshold
      return data?.filter(p => p.quantity <= p.low_stock_threshold) || [];
    },
  });

  if (isLoading) return <div>Loading...</div>;

  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current: {product.quantity} | Threshold: {product.low_stock_threshold}
                </p>
              </div>
              <Badge variant="destructive">{product.quantity} units</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
