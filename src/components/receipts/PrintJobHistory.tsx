import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PrintJob {
  id: string;
  device_id: string;
  job_data: any;
  status: "pending" | "completed" | "failed";
  created_at: string;
  printed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
}

export function PrintJobHistory() {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Fetch print jobs
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["star-cloudprnt-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("star_cloudprnt_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PrintJob[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("print-jobs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "star_cloudprnt_jobs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["star-cloudprnt-jobs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Retry job mutation
  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: job, error: fetchError } = await supabase
        .from("star_cloudprnt_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError) throw fetchError;

      // Reset job to pending with incremented retry count
      const { error: updateError } = await supabase
        .from("star_cloudprnt_jobs")
        .update({
          status: "pending",
          retry_count: job.retry_count + 1,
          error_message: null,
          next_retry_at: null,
        })
        .eq("id", jobId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Print job queued for retry");
      queryClient.invalidateQueries({ queryKey: ["star-cloudprnt-jobs"] });
      setIsRetrying(null);
    },
    onError: (error) => {
      console.error("Error retrying job:", error);
      toast.error("Failed to retry print job");
      setIsRetrying(null);
    },
  });

  const handleRetry = (jobId: string) => {
    setIsRetrying(jobId);
    retryMutation.mutate(jobId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Print Job History</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["star-cloudprnt-jobs"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Track all CloudPRNT print jobs with real-time status updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading print jobs...</div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No print jobs found. Print jobs will appear here once you start printing.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Printed</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="font-mono text-xs">{job.device_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.printed_at
                        ? formatDistanceToNow(new Date(job.printed_at), { addSuffix: true })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {job.retry_count}/{job.max_retries}
                      </span>
                    </TableCell>
                    <TableCell>
                      {job.error_message ? (
                        <span className="text-xs text-destructive truncate max-w-[200px] block">
                          {job.error_message}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {job.status === "failed" && job.retry_count < job.max_retries && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job.id)}
                          disabled={isRetrying === job.id}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {isRetrying === job.id ? "Retrying..." : "Retry"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
