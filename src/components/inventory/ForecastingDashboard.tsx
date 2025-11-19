import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function ForecastingDashboard() {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: forecasts, isLoading, refetch } = useQuery({
    queryKey: ["inventory-forecasts"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("inventory_forecasts")
        .select(`
          *,
          products(name, quantity, categories(name))
        `)
        .eq("forecast_date", today)
        .order("days_until_stockout", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const generateForecasts = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('inventory-forecast');
      
      if (error) throw error;
      
      toast.success(data.message || "Forecasts generated successfully");
      refetch();
    } catch (error: any) {
      console.error("Forecast error:", error);
      if (error.message?.includes('Rate limit')) {
        toast.error("Rate limit exceeded. Please try again later.");
      } else if (error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please add funds.");
      } else {
        toast.error("Failed to generate forecasts");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decreasing": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const criticalItems = forecasts?.filter(f => f.days_until_stockout && f.days_until_stockout <= 7) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Inventory Forecasting</h2>
          <p className="text-sm text-muted-foreground">
            Predictive analytics for stock management
          </p>
        </div>
        <Button onClick={generateForecasts} disabled={isGenerating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? "Generating..." : "Generate Forecasts"}
        </Button>
      </div>

      {/* Critical Alerts */}
      {criticalItems.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.products?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Category: {item.products?.categories?.name || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-destructive">
                      {item.days_until_stockout} days until stockout
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reorder: {item.reorder_suggestion} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecasts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading forecasts...</div>
          ) : !forecasts || forecasts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No forecasts available</p>
              <p className="text-sm">Click "Generate Forecasts" to analyze your inventory</p>
            </div>
          ) : (
            <div className="space-y-4">
              {forecasts.map((forecast) => (
                <div
                  key={forecast.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{forecast.products?.name}</p>
                      {getTrendIcon(forecast.trend)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {forecast.products?.categories?.name || "Uncategorized"}
                    </p>
                  </div>

                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">Current Stock</p>
                      <p className="font-medium">{forecast.products?.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Weekly Demand</p>
                      <p className="font-medium">{Math.round(forecast.predicted_demand)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Days Left</p>
                      <p className={`font-medium ${forecast.days_until_stockout && forecast.days_until_stockout <= 14 ? 'text-destructive' : ''}`}>
                        {forecast.days_until_stockout || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Reorder</p>
                      <p className="font-medium">{forecast.reorder_suggestion}</p>
                    </div>
                    <div>
                      <Badge variant={forecast.confidence_score > 0.7 ? "default" : "secondary"}>
                        {Math.round(forecast.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
