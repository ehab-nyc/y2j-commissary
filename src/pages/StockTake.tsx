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
import { ClipboardList, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export default function StockTake() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [stockTakeName, setStockTakeName] = useState("");

  const { data: stockTakes, isLoading } = useQuery({
    queryKey: ["stock-takes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_takes")
        .select("*, profiles!stock_takes_created_by_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createStockTakeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("stock_takes")
        .insert({
          name: stockTakeName,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-takes"] });
      toast.success("Stock take created");
      setIsCreating(false);
      setStockTakeName("");
    },
    onError: (error) => {
      toast.error("Failed to create stock take");
      console.error(error);
    },
  });

  const completeStockTakeMutation = useMutation({
    mutationFn: async (stockTakeId: string) => {
      const { error } = await supabase
        .from("stock_takes")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", stockTakeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-takes"] });
      toast.success("Stock take completed");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Stock Take</h1>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Stock Take
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Stock Take</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Stock Take Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Monthly Count - January 2025"
                    value={stockTakeName}
                    onChange={(e) => setStockTakeName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => createStockTakeMutation.mutate()}
                  disabled={!stockTakeName || createStockTakeMutation.isPending}
                  className="w-full"
                >
                  Create Stock Take
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stock Take History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading stock takes...</div>
            ) : (
              <div className="space-y-4">
                {stockTakes?.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{st.name}</h3>
                        <Badge variant={st.status === "completed" ? "outline" : "default"}>
                          {st.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created: {new Date(st.created_at).toLocaleDateString()}
                        {st.completed_at &&
                          ` | Completed: ${new Date(st.completed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {st.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() => completeStockTakeMutation.mutate(st.id)}
                        disabled={completeStockTakeMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Complete
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
