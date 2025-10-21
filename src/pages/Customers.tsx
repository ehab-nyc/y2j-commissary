import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, DollarSign } from "lucide-react";

export default function Customers() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles!inner(role)")
        .eq("user_roles.role", "customer")
        .order("total_spent", { ascending: false });

      if (error) throw error;
      return data;
    },
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Customer Management</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${customers?.reduce((sum, c) => sum + Number(c.total_spent || 0), 0).toFixed(2) || "0.00"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Loyalty Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customers?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading customers...</div>
            ) : (
              <div className="space-y-4">
                {customers?.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{customer.full_name || "No Name"}</h3>
                        <Badge variant={getTierColor(customer.customer_tier)}>
                          {customer.customer_tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {customer.email}
                        {customer.phone && ` | ${customer.phone}`}
                      </p>
                      {customer.cart_number && (
                        <p className="text-sm mt-1">
                          Cart: {customer.cart_name} ({customer.cart_number})
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-medium">
                        ${Number(customer.total_spent || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.loyalty_points || 0} points
                      </p>
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
