import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, DollarSign, Package, TrendingUp } from "lucide-react";
import { ProductRecommendations } from "@/components/ProductRecommendations";

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-recent-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name))")
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "default";
      case "gold":
        return "secondary";
      case "silver":
        return "outline";
      default:
        return "outline";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "premium":
        return "💎";
      case "gold":
        return "🥇";
      case "silver":
        return "🥈";
      default:
        return "⭐";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const isLoading = profileLoading || ordersLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto p-6">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            View your rewards, recommendations, and order history
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Customer Tier & Header */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-6xl">
                      {getTierIcon(profile?.customer_tier || "standard")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">
                          {profile?.full_name || "Customer"}
                        </h2>
                        <Badge
                          variant={getTierColor(
                            profile?.customer_tier || "standard"
                          )}
                          className="text-sm"
                        >
                          {profile?.customer_tier || "Standard"} Member
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{profile?.email}</p>
                      {profile?.cart_number && (
                        <p className="text-sm mt-1">
                          Cart: {profile.cart_name} #{profile.cart_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty & Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Loyalty Points
                  </CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {profile?.loyalty_points || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earn 1 point per $1 spent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Spent
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Number(profile?.total_spent || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time purchases
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {recentOrders?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recent orders
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Product Recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle>Recommended for You</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Personalized product suggestions based on your purchase
                  history
                </p>
              </CardHeader>
              <CardContent>
                <ProductRecommendations />
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {!recentOrders || recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="mt-2">
                            {order.order_items
                              ?.slice(0, 3)
                              .map((item: any, idx: number) => (
                                <p key={idx} className="text-sm">
                                  {item.quantity}x {item.products?.name}
                                </p>
                              ))}
                            {order.order_items?.length > 3 && (
                              <p className="text-sm text-muted-foreground">
                                +{order.order_items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ${Number(order.total).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
