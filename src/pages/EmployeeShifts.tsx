import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function EmployeeShifts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["employee-shifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_shifts")
        .select("*")
        .order("clock_in", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch profiles separately
      const employeeIds = data?.map(s => s.employee_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", employeeIds);

      // Merge profiles with shifts
      return data?.map(shift => ({
        ...shift,
        employee_name: profiles?.find(p => p.id === shift.employee_id)?.full_name || "Unknown"
      }));
    },
  });

  const { data: activeShift } = useQuery({
    queryKey: ["active-shift", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("employee_shifts")
        .select("*")
        .eq("employee_id", user.id)
        .is("clock_out", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("employee_shifts")
        .insert({
          employee_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      toast.success("Clocked in successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock in");
      console.error(error);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("No active shift");

      const { error } = await supabase
        .from("employee_shifts")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeShift.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      toast.success("Clocked out successfully");
    },
    onError: (error) => {
      toast.error("Failed to clock out");
      console.error(error);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Employee Time Tracking</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Clock In/Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {!activeShift ? (
                <Button
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  size="lg"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Clock In
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Currently clocked in</p>
                    <p className="text-sm text-muted-foreground">
                      Since: {new Date(activeShift.clock_in).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    size="lg"
                    variant="outline"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Clock Out
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading shifts...</div>
            ) : (
              <div className="space-y-4">
                {shifts?.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {shift.employee_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Clock In: {new Date(shift.clock_in).toLocaleString()}
                      </p>
                      {shift.clock_out && (
                        <p className="text-sm text-muted-foreground">
                          Clock Out: {new Date(shift.clock_out).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {shift.clock_out ? (
                        <Badge variant="outline">
                          {shift.hours_worked?.toFixed(2)} hours
                        </Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
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
