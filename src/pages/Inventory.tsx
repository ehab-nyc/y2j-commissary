import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { Package, Search, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["inventory-products", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,barcode.eq.${searchQuery}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleBarcodeSearch = (barcode: string) => {
    setSearchQuery(barcode);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Search Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <BarcodeScanner onScan={handleBarcodeSearch} />
            </CardContent>
          </Card>

          <LowStockAlerts />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading inventory...</div>
            ) : (
              <div className="space-y-4">
                {products?.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{product.name}</h3>
                        {product.quantity <= product.low_stock_threshold && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {product.barcode && <span>Barcode: {product.barcode} | </span>}
                        Category: {product.categories?.name || "N/A"}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">Stock: {product.quantity}</p>
                      <p className="text-sm text-muted-foreground">
                        Reorder: {product.reorder_point}
                      </p>
                      <p className="text-sm">Cost: ${product.cost_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
