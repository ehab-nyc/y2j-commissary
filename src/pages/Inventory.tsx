import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";
import { ForecastingDashboard } from "@/components/inventory/ForecastingDashboard";
import { AISearchBar } from "@/components/AISearchBar";
import { Package, Search, Plus, Brain } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleBarcodeSearch = (barcode: string) => {
    setSearchQuery(barcode);
  };

  const handleAISearch = (results: any[]) => {
    setFilteredProducts(results);
    toast.success(`Found ${results.length} products`);
  };

  const displayProducts = filteredProducts.length > 0 
    ? filteredProducts 
    : searchQuery 
      ? products?.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.barcode === searchQuery
        )
      : products;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="forecasting">
              <Brain className="h-4 w-4 mr-2" />
              AI Forecasting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Search Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AISearchBar 
                    type="products" 
                    onResults={handleAISearch}
                    placeholder="Try 'products that sell fast' or 'low stock items'..."
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or search by name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setFilteredProducts([]);
                      }}
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
                  Inventory Items ({displayProducts?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading inventory...</div>
                ) : (
                  <div className="space-y-4">
                    {displayProducts?.map((product) => (
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
                          <p className="text-sm">Total Value: ${(Number(product.price) * product.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecasting">
            <ForecastingDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
