import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newPO, setNewPO] = useState({
    supplier_name: "",
    notes: "",
  });

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, profiles!purchase_orders_created_by_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_name: newPO.supplier_name,
          notes: newPO.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase order created");
      setIsCreating(false);
      setNewPO({ supplier_name: "", notes: "" });
    },
    onError: (error) => {
      toast.error("Failed to create purchase order");
      console.error(error);
    },
  });

  const receivePOMutation = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
        })
        .eq("id", poId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase order marked as received");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "ordered":
        return "secondary";
      case "received":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Supplier Name</Label>
                  <Input
                    id="supplier"
                    value={newPO.supplier_name}
                    onChange={(e) =>
                      setNewPO({ ...newPO, supplier_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={newPO.notes}
                    onChange={(e) =>
                      setNewPO({ ...newPO, notes: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={() => createPOMutation.mutate()}
                  disabled={!newPO.supplier_name || createPOMutation.isPending}
                  className="w-full"
                >
                  Create Purchase Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              All Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading purchase orders...</div>
            ) : (
              <div className="space-y-4">
                {purchaseOrders?.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{po.supplier_name}</h3>
                        <Badge variant={getStatusColor(po.status)}>
                          {po.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(po.created_at).toLocaleDateString()} |
                        Total: ${po.total.toFixed(2)}
                      </p>
                      {po.notes && (
                        <p className="text-sm mt-1">{po.notes}</p>
                      )}
                    </div>
                    {po.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => receivePOMutation.mutate(po.id)}
                        disabled={receivePOMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark Received
                      </Button>
                    )}
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
