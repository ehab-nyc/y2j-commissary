import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data available</p>
          ) : (
            products.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.quantity} units sold
                  </p>
                </div>
                <Badge variant="secondary">
                  ${product.revenue.toFixed(2)}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
