import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ThemeVersionHistoryProps {
  themeId: string;
  themeName: string;
  onRestore: (colors: any) => void;
}

export const ThemeVersionHistory = ({ themeId, themeName, onRestore }: ThemeVersionHistoryProps) => {
  const queryClient = useQueryClient();
  const [versionToRestore, setVersionToRestore] = useState<any>(null);
  const [versionToDelete, setVersionToDelete] = useState<string | null>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['theme-versions', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_versions')
        .select('*')
        .eq('theme_id', themeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (version: any) => {
      const { error } = await supabase
        .from('themes')
        .update({ colors: version.colors })
        .eq('id', themeId);
      
      if (error) throw error;
    },
    onSuccess: (_, version) => {
      queryClient.invalidateQueries({ queryKey: ['theme-versions'] });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      onRestore(version.colors);
      toast.success("Version restored successfully");
      setVersionToRestore(null);
    },
    onError: () => {
      toast.error("Failed to restore version");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from('theme_versions')
        .delete()
        .eq('id', versionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-versions'] });
      toast.success("Version deleted");
      setVersionToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete version");
    }
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading versions...</div>;
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History: {themeName}
          </CardTitle>
          <CardDescription>No previous versions available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History: {themeName}
          </CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div 
                key={version.id} 
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">v{version.version_number}</Badge>
                    <span className="text-sm font-medium">
                      {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  {version.description && (
                    <p className="text-sm text-muted-foreground">{version.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVersionToRestore(version)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVersionToDelete(version.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!versionToRestore} onOpenChange={() => setVersionToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Theme Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current theme colors with version {versionToRestore?.version_number}.
              The current version will be saved to history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreMutation.mutate(versionToRestore)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!versionToDelete} onOpenChange={() => setVersionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this version from history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => versionToDelete && deleteMutation.mutate(versionToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
